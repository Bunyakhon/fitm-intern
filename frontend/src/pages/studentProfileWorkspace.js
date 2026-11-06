import { workspaceFields, ProfileSectionDraft, validateProfileDocument, canonicalWorkspaceValue, safeFriendFacebookUrl, profileGenderForPrefix, profilePrefixGenderError } from "./studentProfileWorkspaceDraft.js";
import { updateMyStudentProfile, updateStudentInfo, createStudentProfileRecord, updateStudentProfileRecord, deleteStudentProfileRecord,
  uploadStudentProfileDocument, updateStudentProfileDocument, deleteStudentProfileDocument, downloadStudentProfileDocument, updateStudentProfileAggregate } from "../api/studentProfile.api.js";
import { showToast, showConfirmModal, setButtonLoading } from "../ui/feedback.js";
import { profileMessage, profileFieldError, clearProfileFieldError, clearProfileErrors, notifyProfileChange } from "./studentProfileFeedback.js";
import { mountProfileBirthCalendar } from "./studentProfileBirthCalendar.js";
import { mountProfileAddressSearch } from "./studentProfileAddress.js";

// Presentation choices only: keep API values, draft normalization and PDF rules intact.
const profileChoices = {
  prefix: [["นาย", "นาย"], ["นาง", "นาง"], ["นางสาว", "นางสาว"]],
  gender: [["male", "ชาย"], ["female", "หญิง"], ["ไม่ประสงค์ระบุ", "ไม่ระบุ"]],
  english_prefix: ["Mr.", "Mrs.", "Miss", "Ms."].map(value => [value, value]),
  blood_type: ["A", "B", "AB", "O", "ไม่ทราบ"].map(value => [value, value]),
};
const genderLabel = value => ({ male: "ชาย", female: "หญิง", ชาย: "ชาย", หญิง: "หญิง", ไม่ประสงค์ระบุ: "ไม่ระบุ", ไม่ระบุ: "ไม่ระบุ", unspecified: "ไม่ระบุ", other: "อื่น ๆ" })[String(value).toLowerCase()] || "ค่าเดิมที่บันทึก";
const englishGenderLabel = value => ({ ชาย: "Male", หญิง: "Female", ไม่ระบุ: "Unspecified", "อื่น ๆ": "Other" })[genderLabel(value)] || "Existing value";

const mounted = new WeakMap();
const profileKinds = ["personal", "family", "contacts", "basics", "household", "emergency", "legacyAddresses"];
const documentTypes = [["transcript", "ใบแสดงผลการเรียน", "fa-file-contract"], ["national_id_copy", "สำเนาบัตรประชาชน", "fa-id-card"],
  ["student_id_copy", "สำเนาบัตรนักศึกษา", "fa-address-card"], ["external_profile_pdf", "Profile PDF ต้นฉบับ", "fa-file-pdf"], ["supporting_other", "เอกสารอื่น", "fa-paperclip"]];
export function mountStudentProfileWorkspace({ document, onCommit, reload, externalBusy = () => false, onUnauthorized = () => {}, onSnapshot,
  prepareLegacy = () => ({}), reveal = () => {}, beginMutation = () => {}, rebaseLegacy = () => {}, syncLegacyProfile = () => {} }) {
  const root = document.getElementById("panel-profile");
  if (!root) return null;
  if (mounted.has(root)) return mounted.get(root);
  const entries = new Map(), uploads = new Map(), lists = new Map();
  let titleInput, titleHelp, englishGender, thaiIdentity, renderedPrefix;
  let snapshot = null, busy = false, serial = 0, savingProfile = false, saveFailed = false, legacyConflict = false;
  const node = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
  const button = (label, action, className = "btn-secondary") => { const element = node("button", label, className); element.type = "button"; element.addEventListener("click", action); return element; };
  const status = profileMessage;
  const globalStatus = document.getElementById("profileWorkspaceStatus");
  const mainSave = document.getElementById("profileSaveAll");
  const saveButtons = [mainSave, document.getElementById("profileSaveAllTop")].filter(Boolean);
  let documentsLoading = false, documentsError = false;
  const documentPreviews = new Map();
  function clearDocumentPreviews() {
    for (const url of documentPreviews.values()) URL.revokeObjectURL(url);
    documentPreviews.clear();
  }
  document.defaultView?.addEventListener?.("pagehide", clearDocumentPreviews);
  const getRow = entry => {
    if (profileKinds.includes(entry.kind)) {
      const profile = snapshot?.profile || {};
      return entry.inputs.has("english_prefix") && !Object.hasOwn(profile, "english_prefix")
        ? { ...profile, english_prefix: entry.draft.baseline.english_prefix } : profile;
    }
    if (entry.kind === "academic") return snapshot?.student || {};
    if (entry.addressType) return snapshot?.addresses?.find(row => row.address_type === entry.addressType);
    return snapshot?.[entry.kind]?.find(row => row.id === entry.id);
  };
  function capture(entry) {
    for (const [key, input] of entry.inputs) entry.draft.values[key] = input.value;
    if (entry === thaiIdentity) syncEnglishGender();
  }
  // Format explicit structured fields only. Never infer one address from the
  // other or parse legacy free text. Keep unmatched legacy text in its draft.
  const addressPart = value => value == null ? "" : String(value).trim().replace(/\s+/gu, " ");
  function fullCurrentAddress(values, legacyFormat = false) {
    const bangkok = addressPart(values.province).replace(/^(?:จังหวัด\s*|จ\.\s*)/u, "") === "กรุงเทพมหานคร";
    return [["house_no", ""], ["moo", "หมู่ "], ["road", "ถนน"], ["subdistrict", legacyFormat ? "ตำบล/แขวง" : bangkok ? "แขวง" : "ตำบล"],
      ["district", legacyFormat ? "อำเภอ/เขต" : bangkok ? "เขต" : "อำเภอ"], ["province", "จังหวัด"], ["postal_code", ""]]
      .map(([key, prefix]) => {
        const value = addressPart(values[key]);
        const alreadyPrefixed = !legacyFormat && ({ subdistrict: /^(?:ตำบล|แขวง)/u, district: /^(?:อำเภอ|เขต)/u, province: /^จังหวัด/u })[key]?.test(value);
        return value ? (alreadyPrefixed ? "" : prefix) + value : "";
      }).filter(Boolean).join(" ");
  }
  let currentPreview, registeredPreview, currentAddressHelp, lastGeneratedAddress, rebasingCurrentAddress = false;
  function syncCurrentAddress() {
    const registered = entries.get("address-registered");
    if (registeredPreview && registered) { capture(registered); registeredPreview.value = fullCurrentAddress(registered.draft.values); }
    const source = entries.get("address-current"), text = entries.get("address-text-current");
    if (rebasingCurrentAddress || !currentPreview || !source || !text) return;
    capture(source);
    const generated = fullCurrentAddress(source.draft.values);
    const savedText = text.draft.baseline.current_address;
    const currentText = text.draft.values.current_address;
    const generatedDraft = canonicalWorkspaceValue(text.fields[0], currentText) === lastGeneratedAddress;
    const baselineMatches = !savedText || savedText === fullCurrentAddress(source.draft.baseline) || savedText === fullCurrentAddress(source.draft.baseline, true);
    const safe = baselineMatches && (!text.draft.dirty() || generatedDraft);
    // A 409 review may reveal previously unseen free text. Preserve it rather
    // than reapplying an automatically generated draft over the remote value.
    if (!baselineMatches && generatedDraft) text.draft.values.current_address = savedText;
    // Opening/reloading alone must not create rows or rewrite legacy text.
    if (source.draft.dirty() && safe) text.draft.values.current_address = generated || null;
    else if (safe && text.draft.dirty() && generatedDraft) text.draft.values.current_address = savedText;
    const input = text.inputs.get("current_address");
    input.value = text.draft.values.current_address ?? "";
    input.closest(".form-group").hidden = safe;
    currentPreview.value = generated;
    currentAddressHelp.textContent = safe ? "สร้างจากช่องที่อยู่ปัจจุบันด้านบนโดยอัตโนมัติ"
      : "สร้างตัวอย่างจากช่องด้านบน และเก็บข้อความเดิมไว้แยกต่างหากโดยไม่เขียนทับ บันทึกเฉพาะช่องย่อยที่แก้ไข";
    lastGeneratedAddress = generated || null;
  }
  function titleChanged() {
    if (!titleInput) return false;
    const entry = entries.get("identity");
    return canonicalWorkspaceValue(entry.fields.find(field => field.key === "english_prefix"), titleInput.value) !== entry.draft.baseline.english_prefix;
  }
  function writeChoices(input, options, value) {
    const all = [["", input === englishGender ? "Not specified" : input === titleInput ? "Select title" : "ยังไม่ระบุ"], ...options];
    if (input.children.length !== all.length || all.some(([choice, label], index) => input.children[index].value !== choice || input.children[index].textContent !== label)) {
      input.replaceChildren();
      for (const [choice, label] of all) { const option = node("option", label); option.value = choice; input.append(option); }
    }
    input.value = value;
  }
  function syncEnglishGender() {
    if (!englishGender || !thaiIdentity) return;
    const input = thaiIdentity.inputs.get("gender"), value = input.value;
    writeChoices(englishGender, [...input.children].filter(option => option.value !== "").map(option => [option.value, englishGenderLabel(option.value)]), value);
    englishGender.disabled = input.disabled;
  }
  function identityFeedback() {
    if (!thaiIdentity) return;
    const prefix = thaiIdentity.inputs.get("prefix"), gender = thaiIdentity.inputs.get("gender");
    const message = profilePrefixGenderError(prefix.value, gender.value);
    for (const input of [gender, englishGender].filter(Boolean)) {
      if (message) profileFieldError(input, message, false); else clearProfileFieldError(input);
    }
    return message;
  }
  function afterIdentityEvent() {
    // The shared document listener clears old field errors after input bubbling.
    // Render this pair's current validation afterwards without dispatching events.
    if (document.defaultView?.queueMicrotask) document.defaultView.queueMicrotask(identityFeedback);
    else identityFeedback();
  }
  function updateChoice(input, key, value) {
    const options = profileChoices[key].map(([choice, label]) => key === "gender" && value && genderLabel(value) === label ? [value, label] : [choice, label]);
    if (value !== "" && !options.some(([choice]) => choice === value)) options.push([value, key === "gender" ? genderLabel(value) : value]);
    input.replaceChildren();
    for (const [choice, title] of [["", key === "blood_type" ? "เลือกกรุ๊ปเลือด" : "ยังไม่ระบุ"], ...options]) { const option = node("option", title); option.value = choice; input.append(option); }
    input.value = value;
  }
  function updateInputs(entry) {
    for (const [key, input] of entry.inputs) {
      const value = entry.draft.values[key] ?? "";
      // Preserve stored free-text choices (including legacy blood types) verbatim.
      if (profileChoices[key]) updateChoice(input, key, value);
      input.value = value;
      entry.calendars?.get(key)?.refresh();
    }
    updateLicense(entry);
    updateFriendLink(entry);
    updateRecord(entry);
    entry.addressSearch?.refresh();
    if (entry === thaiIdentity) { renderedPrefix = entry.inputs.get("prefix").value; syncEnglishGender(); identityFeedback(); }
    notifyProfileChange(document);
  }
  function updateFriendLink(entry) {
    if (entry.kind !== "close_friends") return;
    const label = String(entry.draft.values.nickname || "").trim() || "เพื่อนสนิท";
    const url = safeFriendFacebookUrl(String(entry.draft.values.facebook_url || "").trim());
    const name = node(url ? "a" : "span", label);
    if (url) { name.href = url; name.target = "_blank"; name.rel = "noopener noreferrer"; }
    entry.friendName.replaceChildren(name);
  }
  function updateRecord(entry) {
    if (!entry.summary) return;
    const values = entry.draft.baseline;
    entry.summary.replaceChildren();
    const pairs = entry.kind === "education" ? [
      ["ระดับการศึกษา", workspaceFields.education[0].options.find(([value]) => value === values.education_level)?.[1]],
      ["สถานศึกษา", values.institution_name], ["วุฒิการศึกษา", values.qualification], ["สาขาวิชา", values.major],
      ...(values.gpa != null ? [["GPA", values.gpa]] : []),
      ["สถานะการศึกษา", ({ studying: "กำลังศึกษาอยู่", graduated: "สำเร็จการศึกษาแล้ว" })[values.education_status] || "ยังไม่ระบุสถานะ"],
      ...(values.graduation_year != null ? [[values.education_status === "studying" ? "ปีที่ระบุไว้ (ค.ศ.)" : "ปีสำเร็จการศึกษา (ค.ศ.)", values.graduation_year]] : []),
    ] : [["ชื่อหลักสูตร / การดูงาน / การฝึกงาน", values.course_name], ["สถาบันหรือหน่วยงาน", values.institution], ["วุฒิ / ประกาศนียบัตร", values.qualification], ["ระยะเวลา", values.period_text]];
    for (const [label, value] of pairs) { const item = node("div"); item.append(node("dt", label), node("dd", value ?? "ยังไม่ระบุ")); entry.summary.append(item); }
    entry.editor.hidden = !entry.editing; entry.summary.hidden = !!entry.editing; entry.edit.hidden = !!entry.editing;
    if (entry.kind === "education") {
      const input = entry.inputs.get("education_status"); input.disabled = !!entry.deleted || snapshot?.education_status_available === false;
    }
  }
  function updateLicense(entry) {
    if (entry.kind !== "personal") return;
    const absent = entry.draft.values.has_driving_license === false || entry.draft.values.has_driving_license === "false";
    for (const spec of entry.fields.filter(spec => spec.license)) entry.inputs.get(spec.key).closest(".form-group").hidden = absent;
  }
  function clearConflict(entry) {
    entry.draft.conflict = false; entry.review.hidden = true; entry.discard.hidden = true; entry.difference.hidden = true;
  }
  function showDifferences(entry) {
    const latest = getRow(entry) || {};
    const content = node("dl", undefined, "profile-difference-grid");
    for (const spec of entry.fields) {
      const mine = canonicalWorkspaceValue(spec, entry.draft.values[spec.key]);
      const theirs = canonicalWorkspaceValue(spec, latest[spec.key]);
      if (Object.is(mine, theirs)) continue;
      const item = node("div");
      if (spec.sensitive) item.append(node("dt", spec.label), node("dd", "ข้อมูลนี้มีการเปลี่ยนแปลง กรุณาตรวจในช่องกรอก"));
      else item.append(node("dt", spec.label), node("dd", "ค่าที่คุณแก้: " + (mine ?? "ว่าง")), node("dd", "ที่บันทึกแล้ว: " + (theirs ?? "ว่าง")));
      content.append(item);
    }
    if (!content.children.length) content.append(node("p", "ค่าหมวดนี้ตรงกัน แต่ส่วนอื่นในประวัติมีการเปลี่ยนแปลง"));
    entry.difference.replaceChildren(node("h4", "ตรวจความแตกต่างก่อนบันทึก"), content); entry.difference.hidden = false;
  }
  function review(entry, keepChanges) {
    if (busy || externalBusy()) return;
    showConfirmModal({ title: keepChanges ? "ตรวจสอบและโหลดฉบับล่าสุด" : "ทิ้งการแก้ไขหมวดนี้?",
      message: keepChanges ? "โหลดข้อมูลล่าสุดแล้วคงเฉพาะค่าที่คุณแก้ในหมวดนี้ไว้ กรุณาตรวจความแตกต่างและกดบันทึกอีกครั้งเมื่อพร้อม" : "ค่าที่ยังไม่บันทึกในหมวดนี้จะถูกแทนด้วยข้อมูลล่าสุด หมวดอื่นยังคง Draft เดิม",
      confirmLabel: keepChanges ? "โหลดล่าสุดและเก็บค่าที่แก้" : "ทิ้งการแก้ไขหมวดนี้",
      onConfirm: async () => {
        capture(entry); const old = { ...entry.draft.values }, baseline = { ...entry.draft.baseline };
        const result = await reload();
        if (!result || !snapshot?.profile_revision) throw new Error("โหลดไม่สำเร็จ Draft เดิมยังอยู่");
        const row = getRow(entry);
        if (entry.id && !row && !entry.addressType) {
          if (keepChanges) throw new Error("รายการนี้ถูกลบแล้ว เลือกทิ้ง Draft หมวดนี้และเพิ่มรายการใหม่หากต้องการ");
          entries.delete(entry.key); entry.form.remove(); renderLists(); renderDocuments(); return;
        }
        entry.draft.reset(row || {}, snapshot.profile_revision);
        if (keepChanges) for (const spec of entry.fields) if (!Object.is(canonicalWorkspaceValue(spec, old[spec.key]), baseline[spec.key])) entry.draft.values[spec.key] = old[spec.key];
        clearConflict(entry); updateInputs(entry); if (keepChanges) showDifferences(entry);
        syncCurrentAddress(); syncLegacyProfile();
        status(entry.message, "โหลดฉบับล่าสุดแล้ว กรุณาตรวจค่าก่อนบันทึก", "info");
        notifyProfileChange(document, "ready");
      },
    });
  }
  async function perform(target, message, revision, action, after, successMessage = "บันทึกข้อมูลประวัติเรียบร้อยแล้ว") {
    if (busy || externalBusy()) { status(message, "กำลังบันทึกข้อมูลส่วนอื่น กรุณารอสักครู่", "info"); return false; }
    if (!revision) { status(message, "กรุณาโหลดข้อมูลประวัติล่าสุดก่อนบันทึก Draft ยังอยู่", "error"); return false; }
    busy = true; savingProfile = target === mainSave;
    if (savingProfile) saveFailed = false;
    for (const control of savingProfile ? saveButtons : [target]) setButtonLoading(control, true, "กำลังบันทึก...");
    syncDocumentControls();
    beginMutation();
    notifyProfileChange(document);
    status(message, "กำลังบันทึก...", "loading");
    try {
      const result = await action();
      if (!result?.student || !result.profile_revision) throw new Error("ยังยืนยันผลบันทึกไม่ได้ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง");
      after?.(result); controller.acceptSnapshot(result, { ownRevision: revision }); onCommit?.(result, revision);
      if (savingProfile) { saveFailed = false; legacyConflict = false; }
      status(message, "บันทึกเรียบร้อยแล้ว · หากแก้ไขเพิ่มระหว่างบันทึก กรุณาบันทึกส่วนนั้นอีกครั้ง", "success"); notifyProfileChange(document, "saved"); showToast(successMessage, "success"); return true;
    } catch (error) {
      if (savingProfile) saveFailed = true;
      if ([401, 403].includes(error.status)) { onUnauthorized(error); return false; }
      if (error.data?.code === "PROFILE_ENGLISH_TITLE_SCHEMA_PENDING") {
        snapshot = { ...snapshot, profile_english_prefix_available: false }; titleHelp.hidden = false;
        status(message, "BLOCKED: Backend ยืนยันว่าคอลัมน์ Title (English) ยังไม่พร้อม Draft ทั้งหมดยังอยู่", "error"); return false;
      }
      if (error.status === 409) {
        if (savingProfile) legacyConflict = true;
        if (error.data?.student && error.data.profile_revision) controller.acceptSnapshot(error.data);
      }
      status(message, error.status === 409 ? "ประวัติเปลี่ยนจากหน้าต่างอื่น Draft ยังอยู่ โปรดตรวจความแตกต่างก่อนบันทึก" : error.status === 428 ? "ต้องโหลดประวัติล่าสุดก่อนบันทึก Draft ยังอยู่" : !error.status || error.status >= 500 ? "ยังยืนยันผลบันทึกไม่ได้ กรุณาโหลดประวัติล่าสุดและตรวจค่าก่อนลองอีกครั้ง Draft ยังอยู่" : error.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
      return false;
    } finally {
      const targets = savingProfile ? saveButtons : [target];
      busy = false; savingProfile = false;
      for (const control of targets) setButtonLoading(control, false);
      for (const control of saveButtons) control.disabled = !snapshot || externalBusy();
      syncDocumentControls(); renderLists(); notifyProfileChange(document);
    }
  }
  function fieldControl(entry, spec) {
    const group = node("div", undefined, "form-group");
    const id = spec.key === "english_prefix" ? "profileEnglishTitle" : "profileWorkspace-" + entry.key.replace(/[^\w-]/g, "-") + "-" + spec.key;
    const label = node("label", spec.label + (spec.required ? " (จำเป็น)" : "")); label.htmlFor = id;
    const options = profileChoices[spec.key] || spec.options;
    const input = node(options ? "select" : spec.type === "textarea" ? "textarea" : "input"); input.id = id; input.name = spec.key;
    if (spec.placeholder) input.placeholder = spec.placeholder;
    if (options) {
      const empty = node("option", spec.key === "blood_type" || spec.required ? "เลือก" + spec.label : "ยังไม่ระบุ"); empty.value = ""; input.append(empty);
      for (const [value, title] of options) { const option = node("option", title); option.value = value; input.append(option); }
    } else if (spec.type === "textarea") input.rows = 3;
    else {
      input.type = spec.type === "date" ? "date" : ["integer", "gpa", "decimal"].includes(spec.type) ? "number" : spec.type === "phone" ? "tel" : "text";
      if (spec.type === "integer") { input.min = spec.min; input.max = spec.limit; input.step = "1"; }
      if (spec.type === "gpa") { input.min = "0"; input.max = "4"; input.step = "0.01"; }
      if (spec.type === "decimal") { input.min = "0.01"; input.max = "999.99"; input.step = "any"; }
    }
    if (Number.isFinite(spec.max)) input.maxLength = spec.max;
    if (spec.type === "nationalId") { input.inputMode = "numeric"; input.autocomplete = "off"; input.pattern = "[0-9]{13}"; input.spellcheck = false; }
    if (spec.type === "moo") { input.inputMode = "numeric"; input.pattern = "[0-9]{1,2}"; input.autocomplete = "off"; input.spellcheck = false; }
    if (["contacts", "close_friends"].includes(entry.kind)) {
      input.autocomplete = "off";
      input.setAttribute("aria-describedby", "profileContactPrivacy-" + entry.key);
      if (spec.type === "line") input.setAttribute("autocapitalize", "none");
    }
    input.required = !!spec.required; input.disabled = !snapshot; group.append(label, input); entry.inputs.set(spec.key, input);
    if (spec.key === "birth_date") entry.calendars.set(spec.key, mountProfileBirthCalendar({ document, input, group }));
    return group;
  }
  function makeEntry({ key, kind, title, fields, row, id, addressType, isNew = false, container, embedded = false }) {
    // Presentation may share a card; each entry keeps its existing API kind and draft.
    const form = node(embedded ? "div" : "form", undefined, embedded ? "profile-inline-fields" : "info-card profile-entry"); form.noValidate = true; form.dataset.profileEntry = key; form.dataset.profileKind = kind;
    const entry = { key, kind, title, fields, id, addressType, isNew, form, documentType: row?.file_type, inputs: new Map(), calendars: new Map(), draft: new ProfileSectionDraft(fields, row, snapshot?.profile_revision) };
    const heading = node("h3", kind === "close_friends" ? "" : title, "card-title"), grid = node("div", undefined, "profile-entry-grid");
    if (kind === "close_friends") { entry.friendName = node("strong", undefined, "profile-friend-name"); heading.append(entry.friendName); }
    const icons = { academic: "fa-graduation-cap", personal: "fa-circle-user", family: "fa-people-roof", contacts: "fa-address-card", close_friends: "fa-user-group", addresses: "fa-location-dot", education: "fa-school", training: "fa-certificate", skills: "fa-star", documents: "fa-file-lines", basics: "fa-circle-user", household: "fa-people-roof", emergency: "fa-phone", legacyAddresses: "fa-location-dot" };
    const icon = node("i", undefined, "fa-solid " + icons[kind]); icon.setAttribute("aria-hidden", "true"); heading.prepend(icon);
    for (const spec of fields) grid.append(fieldControl(entry, spec));
    if (addressType) entry.addressSearch = mountProfileAddressSearch({ document, inputs: entry.inputs, onChange: changed => {
      for (const key of changed) { clearProfileFieldError(entry.inputs.get(key)); clearProfileFieldError(entry.addressSearch.control(key)); }
      capture(entry); syncCurrentAddress();
      status(entry.message, entry.draft.dirty() ? "มีการแก้ไขที่ยังไม่บันทึก" : "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info"); notifyProfileChange(document, "edit");
    } });
    entry.message = node("p", embedded ? "" : "โหลดข้อมูลประวัติก่อนเริ่มแก้ไข", "message"); entry.message.setAttribute("role", "status"); entry.message.setAttribute("aria-live", "polite");
    entry.save = node("button", "บันทึก" + title, "btn-primary"); entry.save.type = "submit"; entry.save.disabled = !snapshot;
    entry.save.hidden = kind !== "documents";
    entry.review = button("ตรวจความต่าง / เก็บค่าที่แก้", () => review(entry, true)); entry.review.hidden = true;
    entry.discard = button("โหลดล่าสุด / ทิ้งการแก้ไข", () => review(entry, false)); entry.discard.hidden = true;
    entry.difference = node("div", undefined, "profile-difference"); entry.difference.hidden = true;
    const actions = node("div", undefined, "profile-entry-actions"); actions.append(entry.save);
    if (["education", "training"].includes(kind)) {
      entry.editing = isNew; entry.editor = grid;
      entry.summary = node("dl", undefined, "profile-record-summary");
      entry.edit = button("แก้ไข", () => { if (busy || externalBusy() || entry.deleted) return; entry.editing = true; updateRecord(entry); entry.inputs.values().next().value?.focus(); });
      actions.append(entry.edit);
    }
    if (kind !== "documents" && (isNew || (id && !addressType))) { entry.remove = button(isNew ? "ยกเลิกรายการใหม่" : "ลบรายการ", () => removeEntry(entry), "btn-secondary profile-danger"); actions.append(entry.remove); }
    actions.append(entry.review, entry.discard);
    if (!embedded) form.append(heading);
    if (kind === "documents") form.append(node("p", "บันทึกชื่อกำกับเอกสารแยกจากประวัติ", "profile-tab-help"));
    if (entry.summary) form.append(entry.summary);
    form.append(grid, entry.difference, actions, entry.message);
    if (["contacts", "close_friends"].includes(kind)) {
      const privacy = node("p", kind === "close_friends" ? "ใช้ข้อมูลเพื่อนสนิทเพื่อติดต่อกรณีจำเป็นเมื่อไม่สามารถติดต่อนักศึกษาได้ ควรแจ้งเจ้าของข้อมูลก่อนบันทึก" : "ข้อมูลติดต่อส่วนตัว ใช้เพื่อการติดต่อกรณีจำเป็น ช่องทั้งหมดเว้นว่างได้", "profile-tab-help");
      privacy.id = "profileContactPrivacy-" + key; grid.before(privacy);
    }
    form.addEventListener("input", event => {
      if (event?.target && ![...entry.inputs.values()].includes(event.target)) return;
      capture(entry); updateFriendLink(entry); status(entry.message, entry.draft.dirty() || entry.isNew ? "มีการแก้ไขที่ยังไม่บันทึก" : "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info");
      if (entry.addressType) syncCurrentAddress();
    });
    form.addEventListener("change", event => {
      if (event?.target && ![...entry.inputs.values()].includes(event.target)) return;
      capture(entry); updateLicense(entry);
      if (entry.addressType) syncCurrentAddress();
      if (event.target.name === "has_driving_license" && event.target.value === "false" && fields.some(spec => spec.license && entry.draft.values[spec.key])) {
        showConfirmModal({ title: "ล้างรายละเอียดใบขับขี่?", message: "คุณเลือกไม่มีใบขับขี่ รายละเอียดเดิมยังไม่ได้ลบ หากยืนยันจะล้างเลขที่ ประเภท และวันหมดอายุใน Draft แล้วกดบันทึกเพื่อยืนยันอีกครั้ง",
          confirmLabel: "ล้างรายละเอียดใน Draft", onConfirm: () => { for (const spec of fields.filter(spec => spec.license)) entry.draft.values[spec.key] = null; updateInputs(entry); } });
      }
    });
    form.addEventListener("submit", event => { event.preventDefault(); event.stopPropagation(); kind === "documents" ? saveEntry(entry) : saveAll(); });
    entries.set(key, entry);
    const before = embedded && [...(container?.children || [])].find(child => child.className === "profile-difference");
    if (before) before.before(form); else container?.append(form);
    updateInputs(entry); return entry;
  }
  async function saveAll() {
    if (busy || externalBusy() || !snapshot) return false;
    syncCurrentAddress();
    if (titleChanged() && snapshot.profile_english_prefix_available !== true) {
      const message = "BLOCKED: ยังบันทึก Title (English) ไม่ได้ เนื่องจาก Backend/Database ยังไม่รองรับ คงค่าเดิมของ Title เพื่อบันทึกข้อมูลส่วนอื่น Draft ทั้งหมดยังอยู่";
      reveal(titleInput); profileFieldError(titleInput, message); status(globalStatus, message, "error"); return false;
    }
    const payload = {}, submitted = [], operations = [], revision = snapshot.profile_revision;
    let legacy;
    try {
      legacy = prepareLegacy();
      if (legacy.revisions?.some(value => value !== revision)) { legacyConflict = true; throw new Error("ข้อมูลเปลี่ยนแล้ว กรุณาตรวจฉบับล่าสุดก่อนบันทึก Draft ยังอยู่"); }
      if (Object.keys(legacy.student || {}).length) payload.student = { ...legacy.student };
      if (Object.keys(legacy.profile || {}).length) payload.profile = { ...legacy.profile };
      for (const entry of entries.values()) {
        if (entry.kind === "documents") continue;
        capture(entry); clearProfileErrors(entry.form);
        const badInput = [...entry.inputs.values()].some(input => input.validity?.badInput);
        if (!entry.deleted && !entry.isNew && !entry.draft.dirty() && !badInput) continue;
        if (entry.draft.revision !== revision || entry.draft.conflict) {
          showDifferences(entry); entry.review.hidden = false; entry.discard.hidden = false;
          throw new Error("ประวัติเปลี่ยนแล้ว โปรดตรวจความต่างในหมวดที่แก้ก่อนบันทึก Draft ยังอยู่");
        }
        let patch;
        try {
          for (const [field, input] of entry.inputs) if (!entry.deleted && input.validity?.badInput) throw Object.assign(new Error("กรุณากรอกวันที่หรือตัวเลขให้ถูกต้อง"), { field });
          patch = entry.deleted ? {} : entry.draft.patch(entry.isNew || (entry.addressType && !entry.id));
          if (entry.kind === "education" && snapshot.education_status_available === false && Object.hasOwn(patch, "education_status")) {
            if (patch.education_status != null) throw Object.assign(new Error("สถานะการศึกษายังไม่พร้อมใช้งาน Draft ยังอยู่"), { field: "education_status" });
            delete patch.education_status;
          }
          if (entry.addressType && snapshot.address_moo_available === false && Object.hasOwn(patch, "moo")) {
            if (patch.moo != null) throw Object.assign(new Error("ช่องหมู่ที่ยังไม่พร้อมใช้งาน Draft ยังอยู่ กรุณาติดตั้งคอลัมน์ moo ก่อนบันทึก"), { field: "moo" });
            delete patch.moo;
          }
        } catch (error) {
          if (entry.summary) { entry.editing = true; updateRecord(entry); }
          reveal(entry.form); if (error.field) profileFieldError(entry.addressSearch?.control(error.field) || entry.inputs.get(error.field), error.message);
          status(entry.message, error.message, "error"); throw error;
        }
        if (entry.kind === "contacts" && snapshot.profile_contacts_available === false || entry.kind === "close_friends" && snapshot.close_friends_available === false) {
          reveal(entry.form); throw new Error("ยังไม่เปิดบันทึกข้อมูลติดต่อเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ Draft ยังอยู่");
        }
        const sent = { ...entry.draft.values };
        submitted.push({ entry, sent });
        if (profileKinds.includes(entry.kind)) {
          for (const [field, value] of Object.entries(patch)) {
            if (Object.hasOwn(payload.profile || {}, field) && !Object.is(payload.profile[field], value)) throw new Error("ข้อมูลใน Modal และฟอร์มหลักต่างกัน โปรดเลือกค่าที่ต้องการก่อนบันทึก");
            (payload.profile ||= {})[field] = value;
          }
        } else if (entry.kind === "academic") Object.assign(payload.student ||= {}, patch);
        else {
          const action = entry.deleted ? "delete" : entry.id ? "update" : "create";
          const value = action === "delete" ? entry.id : action === "update" ? { id: entry.id, changes: patch }
            : { ...patch, ...(entry.addressType ? { address_type: entry.addressType } : {}) };
          ((payload[entry.kind] ||= {})[action] ||= []).push(value);
          operations.push({ entry, action });
        }
      }
      const state = { ...(snapshot.profile || {}), ...payload.profile };
      const identityError = profilePrefixGenderError(state.prefix, state.gender);
      if (identityError) {
        const gender = thaiIdentity.inputs.get("gender");
        reveal(gender); identityFeedback(); profileFieldError(gender, identityError);
        throw new Error(identityError);
      }
      for (const [field, message] of [
        [state.national_id_issue_date && state.national_id_expiry_date && state.national_id_expiry_date < state.national_id_issue_date ? "national_id_expiry_date" : null, "วันหมดอายุบัตรต้องไม่ก่อนวันออกบัตร"],
        [state.has_driving_license === false && ["driving_license_number", "driving_license_type", "driving_license_expiry_date"].some(key => state[key] != null) ? "has_driving_license" : null, "กรุณายืนยันล้างรายละเอียดใบขับขี่"]
      ]) if (field) {
        const entry = entries.get("personal"); reveal(entry.form); profileFieldError(entry.inputs.get(field), message); throw new Error(message);
      }
    } catch (error) { status(globalStatus, error.message, "error"); return false; }
    if (!Object.keys(payload).length) { status(globalStatus, "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info"); return false; }
    return perform(mainSave, globalStatus, revision, () => updateStudentProfileAggregate(payload, revision), result => {
      if (Object.hasOwn(payload.profile || {}, "english_prefix") && (result.profile_english_prefix_available !== true
        || !Object.hasOwn(result.profile || {}, "english_prefix") || result.profile.english_prefix !== payload.profile.english_prefix)) {
        if (result.profile_english_prefix_available !== true) { snapshot = { ...snapshot, profile_english_prefix_available: false }; titleHelp.hidden = false; }
        throw new Error("ยังยืนยันผลบันทึก Title (English) ไม่ได้ Draft ยังอยู่ กรุณาโหลดฉบับล่าสุดและตรวจสอบก่อนลองอีกครั้ง");
      }
      // Receipts match explicit operation order by kind/action; no user values or
      // client-supplied foreign keys are needed to bind new rows to stable IDs.
      const receipts = [...(result.aggregate_operations || [])];
      const acknowledged = operations.map(({ entry, action }) => {
        const index = receipts.findIndex(item => item.kind === entry.kind && item.action === action && (action === "create" || item.id === entry.id));
        if (index < 0) throw new Error("ยังยืนยันผลบันทึกรายการไม่ได้ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง");
        const receipt = receipts.splice(index, 1)[0];
        if (!receipt.id || (action === "delete" ? result[entry.kind]?.some(row => row.id === receipt.id) : !result[entry.kind]?.some(row => row.id === receipt.id))) {
          throw new Error("ผลบันทึกรายการไม่ครบ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง Draft ยังอยู่");
        }
        return { entry, action, receipt };
      });
      for (const { entry, action, receipt } of acknowledged) {
        if (action === "delete") { entries.delete(entry.key); entry.form.remove(); }
        else { entry.id = receipt.id; entry.isNew = false; if (entry.remove) entry.remove.textContent = "ลบรายการ"; }
      }
      legacy.accept?.(result);
      syncCurrentAddress();
      const previous = snapshot; snapshot = result;
      rebasingCurrentAddress = true;
      for (const { entry, sent } of submitted) {
        if (entry.deleted) continue;
        capture(entry); entry.draft.accept(getRow(entry) || {}, result.profile_revision, { ownRevision: revision, sent });
        if (entry.summary) entry.editing = entry.draft.dirty();
        updateInputs(entry); clearConflict(entry); status(entry.message, entry.draft.dirty() ? "มีการแก้ไขระหว่างบันทึก กรุณาบันทึกอีกครั้ง" : "บันทึกเรียบร้อยแล้ว", "success");
      }
      snapshot = previous;
      rebasingCurrentAddress = false;
    });
  }
  async function saveEntry(entry) {
    capture(entry);
    clearProfileErrors(entry.form);
    if (entry.draft.conflict) { showDifferences(entry); status(entry.message, "โปรดตรวจความต่างหรือโหลดฉบับล่าสุดก่อนบันทึก Draft ยังอยู่", "error"); return; }
    let patch;
    try {
      for (const [field, input] of entry.inputs) if (input.validity?.badInput) throw Object.assign(new Error("กรุณากรอกวันที่หรือตัวเลขให้ครบถ้วนและถูกต้อง"), { field });
      patch = entry.draft.patch(entry.isNew || (entry.addressType && !entry.id));
      const state = { ...(snapshot?.profile || {}), ...patch };
      if (entry.kind === "personal" && state.national_id_issue_date && state.national_id_expiry_date && state.national_id_expiry_date < state.national_id_issue_date) throw Object.assign(new Error("วันหมดอายุบัตรต้องไม่ก่อนวันออกบัตร"), { field: "national_id_expiry_date" });
      if (entry.kind === "personal" && state.has_driving_license === false && ["driving_license_number", "driving_license_type", "driving_license_expiry_date"].some(key => state[key] != null)) throw new Error("กรุณายืนยันล้างรายละเอียดใบขับขี่ก่อนบันทึกว่าไม่มีใบขับขี่");
    } catch (error) { if (error.field) profileFieldError(entry.inputs.get(error.field), error.message); status(entry.message, error.message, "error"); return; }
    if (!Object.keys(patch).length) { status(entry.message, "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info"); return; }
    const sent = { ...entry.draft.values }, revision = entry.draft.revision;
    const action = () => entry.kind === "academic" ? updateStudentInfo(patch, revision)
      : profileKinds.includes(entry.kind) ? updateMyStudentProfile(patch, revision)
      : entry.kind === "documents" ? updateStudentProfileDocument(entry.id, patch, revision)
      : entry.id ? updateStudentProfileRecord(entry.kind, entry.id, patch, revision)
      : createStudentProfileRecord(entry.kind, { ...patch, ...(entry.addressType ? { address_type: entry.addressType } : {}) }, revision);
    const saved = await perform(entry.save, entry.message, revision, action, result => {
      capture(entry);
      const row = entry.kind === "academic" ? result.student : profileKinds.includes(entry.kind) ? result.profile : entry.kind === "documents" ? result.documents.find(row => row.id === entry.id) : result.record;
      entry.draft.accept(row || {}, result.profile_revision, { ownRevision: revision, sent });
      if (result.record) { entry.id = result.record.id; entry.isNew = false; if (entry.remove) entry.remove.textContent = "ลบรายการ"; }
      updateInputs(entry); clearConflict(entry);
    });
    if (!saved && revision) { entry.draft.conflict = /หน้าต่างอื่น|โหลดประวัติล่าสุด/.test(entry.message.textContent); entry.review.hidden = !entry.draft.conflict; entry.discard.hidden = !entry.draft.conflict; if (entry.draft.conflict) showDifferences(entry); }
  }
  function removeEntry(entry) {
    if (busy || externalBusy()) return;
    if (entry.deleted) {
      entry.deleted = false;
      for (const input of entry.inputs.values()) input.disabled = false;
      entry.remove.textContent = "ลบรายการ";
      status(entry.message, "ยกเลิกการลบแล้ว Draft เดิมยังอยู่", "info");
      notifyProfileChange(document, "edit"); return;
    }
    showConfirmModal({ title: entry.isNew ? "ยกเลิกรายการใหม่?" : "ลบรายการนี้?", message: "ลบเฉพาะรายการนี้ การแก้ไขในรายการอื่นยังคงอยู่", confirmLabel: entry.isNew ? "ยกเลิกรายการ" : "ลบรายการ",
      onConfirm: async () => {
        if (busy || externalBusy()) return;
        if (!entry.id) { entries.delete(entry.key); entry.form.remove(); notifyProfileChange(document, "edit"); return; }
        entry.deleted = !entry.deleted;
        for (const input of entry.inputs.values()) input.disabled = entry.deleted;
        entry.remove.textContent = entry.deleted ? "ยกเลิกการลบ" : "ลบรายการ";
        status(entry.message, "รอลบเมื่อกดบันทึกประวัติ · ยกเลิกการลบได้", "info");
        notifyProfileChange(document, "edit");
      },
    });
  }
  function listSection(containerId, kind, title, category) {
    const container = document.getElementById(containerId); if (!container) return;
    const section = node("section", undefined, "profile-record-section");
    const header = node("div", undefined, "profile-section-header"); header.append(node("h3", title));
    const list = node("div", undefined, "profile-record-list");
    const empty = node("p", "ยังไม่มีรายการ กดเพิ่มเพื่อกรอกข้อมูล", "profile-empty-state");
    const add = button("เพิ่ม" + title, () => {
      if (busy || externalBusy() || !snapshot || kind === "close_friends" && snapshot.close_friends_available === false) return;
      empty.hidden = true;
      const entry = makeEntry({ key: "new-" + (++serial), kind, title, fields: workspaceFields[kind], row: category ? { category } : {}, isNew: true, container: list }); entry.inputs.values().next().value?.focus();
    }); add.disabled = true; header.append(add); section.append(header, empty, list); container.append(section);
    lists.set(containerId, { kind, category, title, list, empty, add });
  }
  function renderLists(ownRevision) {
    for (const section of lists.values()) {
      section.add.disabled = !snapshot || busy || section.kind === "close_friends" && snapshot.close_friends_available === false;
      let rows = (snapshot?.[section.kind] || []).filter(row => !section.category || row.category === section.category);
      if (section.kind === "education") {
        const rank = { bachelor: 0, high_vocational: 1, high_school_vocational: 2 };
        rows = rows.map((row, index) => ({ row, index })).sort((a, b) => (rank[a.row.education_level] ?? 3) - (rank[b.row.education_level] ?? 3)
          || (a.row.display_order ?? 0) - (b.row.display_order ?? 0) || a.index - b.index).map(item => item.row);
      }
      for (const row of rows) {
        let entry = [...entries.values()].find(entry => entry.kind === section.kind && entry.id === row.id);
        if (!entry) entry = makeEntry({ key: section.kind + "-" + row.id, kind: section.kind, title: section.title, fields: workspaceFields[section.kind], row, id: row.id, container: section.list });
        else if (section.kind === "education" || entry.form.parentElement !== section.list) section.list.append(entry.form);
      }
      section.empty.hidden = section.list.children.length > 0;
      if (section.kind === "close_friends" && snapshot?.close_friends_available === false) {
        section.empty.hidden = false;
        section.empty.textContent = snapshot.close_friends_legacy_pending ? "ข้อมูลเพื่อนสนิทเดิมอยู่ระหว่างตรวจรักษาข้อมูล กรุณาติดต่อผู้ดูแลระบบ" : "ยังไม่เปิดบันทึกข้อมูลเพื่อนสนิท กรุณาติดต่อผู้ดูแลระบบ";
      } else section.empty.textContent = "ยังไม่มีรายการ กดเพิ่มเพื่อกรอกข้อมูล";
    }
  }
  function renderDocuments() {
    clearDocumentPreviews();
    for (const entry of uploads.values()) {
      const rows = (snapshot?.documents || []).filter(row => row.file_type === entry.type);
      entry.list.replaceChildren();
      entry.list.setAttribute("aria-busy", String(documentsLoading || !snapshot && !documentsError));
      const state = node("p", documentsLoading || !snapshot && !documentsError ? "กำลังโหลดเอกสาร…" : documentsError ? "โหลดเอกสารไม่สำเร็จ ข้อมูลที่แสดงอาจยังไม่ใช่ฉบับล่าสุด" : rows.length ? "อัปโหลดแล้ว" : "ยังไม่มีเอกสาร", "profile-document-state");
      state.setAttribute("role", "status"); entry.list.append(state);
      if (documentsError && !documentsLoading) entry.list.append(button("ลองโหลดเอกสารอีกครั้ง", refreshDocuments));
      entry.replace.hidden = !rows.length || entry.type === "supporting_other";
      for (const file of rows) {
        const row = node("article", undefined, "profile-document-row");
        const meta = node("div", undefined, "profile-document-meta");
        meta.append(node("strong", file.original_name));
        if (file.document_label) meta.append(node("span", file.document_label));
        const size = Number(file.file_size);
        const date = file.createdAt ? new Date(file.createdAt) : null;
        meta.append(node("small", [({ "application/pdf": "PDF", "image/jpeg": "JPEG", "image/png": "PNG" })[file.mime_type] || "เอกสาร",
          Number.isFinite(size) && size > 0 ? (size >= 1024 * 1024 ? (size / (1024 * 1024)).toFixed(1) + " MB" : Math.ceil(size / 1024) + " KB") : null,
          file.document_version ? "รุ่น " + file.document_version : null,
          date && !Number.isNaN(date.valueOf()) ? "อัปโหลด " + date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : null].filter(Boolean).join(" · ")));
        const actions = node("div", undefined, "profile-entry-actions");
        actions.append(button("ดูเอกสาร", async event => {
          const target = event.currentTarget; if (target.disabled || documentPreviews.has(file.id)) return;
          setButtonLoading(target, true, "กำลังเปิด…");
          try {
            const blob = await downloadStudentProfileDocument(file.id);
            if (!row.parentElement) return;
            // Only a protected response becomes a local Blob URL; never link storage paths.
            const prior = documentPreviews.get(file.id); if (prior) URL.revokeObjectURL(prior);
            const url = URL.createObjectURL(new Blob([blob], { type: file.mime_type })); documentPreviews.set(file.id, url);
            const preview = node("section", undefined, "profile-document-preview");
            const media = node(file.mime_type === "application/pdf" ? "iframe" : "img");
            media.src = url; media.title = "เอกสาร " + file.original_name; media.alt = file.original_name;
            const close = button("ปิดเอกสาร", () => { URL.revokeObjectURL(url); documentPreviews.delete(file.id); preview.remove(); target.disabled = false; target.focus(); });
            preview.append(close, media); row.append(preview); close.focus();
          } catch (error) { status(entry.message, error.message || "เปิดเอกสารไม่สำเร็จ", "error"); if ([401, 403].includes(error.status)) onUnauthorized(error); }
          finally { setButtonLoading(target, false); }
        }));
        actions.append(button("ดาวน์โหลด", async event => {
          const target = event.currentTarget; setButtonLoading(target, true, "กำลังดาวน์โหลด...");
          try { const blob = await downloadStudentProfileDocument(file.id); const url = URL.createObjectURL(blob); const link = node("a"); link.href = url; link.download = file.original_name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
          catch (error) { status(entry.message, error.message || "ดาวน์โหลดไม่สำเร็จ", "error"); if ([401, 403].includes(error.status)) onUnauthorized(error); }
          finally { setButtonLoading(target, false); }
        }));
        if (entry.type === "supporting_other" || file.document_label) actions.append(button("แก้ชื่อเอกสาร", () => {
          const key = "documents-" + file.id;
          let editor = entries.get(key);
          if (!editor) editor = makeEntry({ key, kind: "documents", title: "ชื่อกำกับเอกสาร", fields: [{ key: "document_label", label: "ชื่อกำกับเอกสาร", type: "text", max: 255 }], row: file, id: file.id, container: row });
          editor.inputs.get("document_label").focus();
        }));
        actions.append(button("นำออก", () => {
          if (busy || externalBusy()) return;
          showConfirmModal({ title: "นำเอกสารออกจากรายการปัจจุบัน?", message: "เอกสารรุ่นเก่ายังคงอยู่ในระบบ การนำออกไม่ได้ลบไฟล์ถาวร", confirmLabel: "นำเอกสารออก", onConfirm: async () => {
            const saved = await perform(entry.save, entry.message, entry.revision, () => deleteStudentProfileDocument(file.id, entry.revision)); if (!saved) throw new Error(entry.message.textContent);
          } });
        }, "btn-secondary profile-danger")); row.append(meta, actions);
        const editor = entries.get("documents-" + file.id); if (editor) row.append(editor.form);
        entry.list.append(row);
      }
      for (const editor of entries.values()) if (editor.kind === "documents" && editor.documentType === entry.type && !rows.some(row => row.id === editor.id)) entry.list.append(editor.form);
    }
  }
  function syncDocumentControls() {
    for (const entry of uploads.values()) {
      const locked = busy || externalBusy() || documentsLoading || !snapshot;
      entry.input.disabled = locked; entry.labelInput.disabled = locked; entry.replace.disabled = locked;
      entry.save.disabled = locked || !entry.file || !!entry.validationError;
    }
  }
  async function refreshDocuments() {
    if (busy || externalBusy() || documentsLoading) return false;
    documentsLoading = true; documentsError = false; renderDocuments(); syncDocumentControls();
    try {
      // Existing full-snapshot loader captures/reconciles drafts at response time.
      const revision = snapshot?.profile_revision;
      const result = await reload();
      const ready = !!result || !!revision && snapshot?.profile_revision !== revision;
      documentsError = !ready; return ready;
    } catch (error) {
      documentsError = true; if ([401, 403].includes(error.status)) onUnauthorized(error); return false;
    } finally { documentsLoading = false; renderDocuments(); syncDocumentControls(); }
  }
  function reviewDocument(entry) {
    showConfirmModal({ title: "เอกสารมีการเปลี่ยนแปลง", message: "โหลดฉบับล่าสุดและเก็บไฟล์ที่เลือกไว้ ตรวจรายการเอกสารแล้วกดอัปโหลดอีกครั้งเมื่อพร้อม", confirmLabel: "โหลดล่าสุดและเก็บไฟล์", onConfirm: async () => {
      if (!await refreshDocuments()) throw new Error("โหลดไม่สำเร็จ ไฟล์และ Draft ยังอยู่");
      entry.revision = snapshot.profile_revision; entry.conflict = false;
      status(entry.message, "โหลดฉบับล่าสุดแล้ว ไฟล์ที่เลือกยังอยู่ กรุณาตรวจเอกสารก่อนอัปโหลดอีกครั้ง", "info");
    } });
  }
  function documentSection(type, title, icon) {
    const container = document.getElementById("profileDocumentCards"); if (!container) return;
    const form = node("section", undefined, "info-card profile-document-card"); form.dataset.documentType = type;
    const uploadForm = node("form", undefined, "profile-document-upload"); uploadForm.noValidate = true;
    const heading = node("h3", title, "card-title"); const symbol = node("i", undefined, "fa-solid " + icon); symbol.setAttribute("aria-hidden", "true"); heading.prepend(symbol);
    const list = node("div", undefined, "profile-document-list");
    const label = node("label", "เลือกไฟล์" + title); const input = node("input"); input.type = "file"; input.disabled = true; input.accept = type === "external_profile_pdf" ? ".pdf" : ".pdf,.jpg,.jpeg,.png"; input.id = "profileDocument-" + type; label.htmlFor = input.id;
    const labelInput = node("input"); labelInput.type = "text"; labelInput.maxLength = 255; labelInput.id = input.id + "-label";
    labelInput.required = type === "supporting_other";
    const caption = node("label", "ชื่อเอกสาร (จำเป็น)"); caption.htmlFor = labelInput.id;
    const save = node("button", "อัปโหลดเอกสาร", "btn-primary"); save.type = "submit"; save.disabled = true;
    const message = node("p", "เลือกไฟล์เพื่ออัปโหลด", "message"); message.id = input.id + "-status"; message.setAttribute("role", "status"); message.setAttribute("aria-live", "polite");
    const help = node("p", type === "external_profile_pdf" ? "PDF ไม่เกิน 10 MB · เก็บต้นฉบับเท่านั้น ไม่มีการนำเข้าข้อมูล" : "PDF/JPEG/PNG ไม่เกิน 10 MB ต่อไฟล์", "profile-tab-help"); help.id = input.id + "-help";
    const selected = node("p", "ยังไม่เลือกไฟล์", "profile-selected-file");
    input.setAttribute("aria-describedby", help.id + " " + message.id);
    labelInput.setAttribute("aria-describedby", message.id);
    const replace = button("อัปโหลดฉบับใหม่", () => { input.focus(); input.click(); }); replace.hidden = true;
    const entry = { type, form, list, input, labelInput, save, message, selected, replace, revision: null, file: null, validationError: false, conflict: false };
    function validateSelection() {
      clearProfileErrors(uploadForm); entry.validationError = false;
      selected.textContent = entry.file ? "ไฟล์ที่เลือก: " + entry.file.name : "ยังไม่เลือกไฟล์";
      if (entry.file) {
        try { validateProfileDocument(entry.file, type, labelInput.value); status(message, "เลือกไฟล์แล้ว ยังไม่อัปโหลด"); }
        catch (error) { entry.validationError = true; profileFieldError(error.message === "กรุณาระบุชื่อเอกสารอื่น" ? labelInput : input, error.message); status(message, error.message, "error"); }
      } else status(message, "เลือกไฟล์เพื่ออัปโหลด");
      syncDocumentControls(); notifyProfileChange(document, "edit");
    }
    input.addEventListener("change", () => { entry.file = input.files?.[0] || null; if (!entry.conflict) entry.revision = snapshot?.profile_revision; validateSelection(); });
    labelInput.addEventListener("input", validateSelection);
    uploadForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (busy || externalBusy() || documentsLoading || !snapshot) return;
      clearProfileErrors(uploadForm);
      try { validateProfileDocument(entry.file, type, labelInput.value); }
      catch (error) { profileFieldError(error.message === "กรุณาระบุชื่อเอกสารอื่น" ? labelInput : input, error.message); status(message, error.message, "error"); return; }
      if (entry.conflict || entry.revision !== snapshot.profile_revision) { reviewDocument(entry); return; }
      const body = new FormData(); body.append("document", entry.file); if (labelInput.value.trim()) body.append("document_label", labelInput.value.trim());
      input.disabled = true; labelInput.disabled = true;
      try {
        const saved = await perform(save, message, entry.revision, async () => {
          try {
            const result = await uploadStudentProfileDocument(type, body, entry.revision, progress => {
              status(message, progress.total ? "ส่งไฟล์ " + Math.round(progress.loaded / progress.total * 100) + "% · รอระบบยืนยันการบันทึก" : "กำลังส่งไฟล์และรอระบบยืนยันการบันทึก", "loading");
            });
            if (!result?.document?.id || !result.documents?.some(file => file.id === result.document.id && file.file_type === type)) throw new Error("ยังยืนยันเอกสารที่อัปโหลดไม่ได้ ไฟล์ที่เลือกยังอยู่");
            return result;
          } catch (error) { if (error.status === 409) entry.conflict = true; throw error; }
        }, () => { entry.file = null; input.value = ""; labelInput.value = ""; selected.textContent = "ยังไม่เลือกไฟล์"; }, "อัปโหลดเอกสารเรียบร้อยแล้ว");
        if (saved) status(message, "อัปโหลดเอกสารเรียบร้อยแล้ว", "success");
        else if (entry.conflict) reviewDocument(entry);
      } finally { syncDocumentControls(); }
    });
    uploadForm.append(label, input, selected, help);
    if (type === "supporting_other") uploadForm.append(caption, labelInput);
    uploadForm.append(save, replace);
    form.append(heading, list, uploadForm, message);
    uploads.set(type, entry); container.append(form);
  }
  const controller = {
    saveAll,
    refreshDocuments,
    refreshControls: syncDocumentControls,
    profileValues() {
      syncCurrentAddress();
      const values = {};
      for (const entry of entries.values()) if (profileKinds.includes(entry.kind)) { capture(entry); Object.assign(values, entry.draft.values); }
      return values;
    },
    setProfileField(field, value) {
      const entry = [...entries.values()].find(entry => profileKinds.includes(entry.kind) && entry.inputs.has(field));
      if (!entry) return;
      capture(entry); entry.draft.values[field] = value; updateInputs(entry);
      syncCurrentAddress();
      status(entry.message, "มีการแก้ไขที่ยังไม่บันทึก", "info"); notifyProfileChange(document, "edit");
    },
    get busy() { return busy; },
    get savingProfile() { return savingProfile; },
    get saveFailed() { return saveFailed; },
    get hasConflict() {
      return legacyConflict || [...entries.values()].some(entry => entry.kind !== "documents" &&
        (entry.draft.conflict || (entry.deleted || entry.isNew || entry.draft.dirty()) && entry.draft.revision !== snapshot?.profile_revision));
    },
    get snapshot() { return snapshot; },
    hasChanges() { syncCurrentAddress(); for (const entry of entries.values()) { capture(entry); if (entry.deleted || entry.isNew || entry.draft.dirty() || [...entry.inputs.values()].some(input => input.validity?.badInput)) return true; } return [...uploads.values()].some(entry => entry.file || entry.labelInput.value); },
    acceptSnapshot(result, { ownRevision } = {}) {
      if (!result?.student || !result.profile_revision) return;
      for (const entry of entries.values()) capture(entry);
      syncCurrentAddress();
      rebasingCurrentAddress = true;
      snapshot = result;
      documentsError = false;
      titleHelp.hidden = result.profile_english_prefix_available === true;
      if (titleHelp.hidden) clearProfileErrors(titleInput.closest(".form-group"));
      for (const entry of [...entries.values()]) {
        const row = getRow(entry);
        if (entry.id && !row && !entry.addressType) {
          if (entry.draft.dirty() || entry.draft.conflict) { entry.draft.conflict = true; entry.review.hidden = false; entry.discard.hidden = false; status(entry.message, "รายการนี้ไม่อยู่ในข้อมูลล่าสุด Draft ยังอยู่ กรุณาเลือกทิ้ง Draft หรือเพิ่มรายการใหม่", "error"); }
          else { entries.delete(entry.key); entry.form.remove(); }
          continue;
        }
        if (entry.isNew) { if (!entry.draft.revision || entry.draft.revision === ownRevision) entry.draft.revision = result.profile_revision; }
        else if ((!entry.deleted || entry.draft.revision === ownRevision || entry.draft.revision === result.profile_revision)
          && entry.draft.accept(row || {}, result.profile_revision, { ownRevision })) { updateInputs(entry); clearConflict(entry); }
        if (entry.addressType) entry.id = row?.id;
        entry.save.disabled = false; if (entry.message.textContent === "โหลดข้อมูลประวัติก่อนเริ่มแก้ไข") status(entry.message, "ข้อมูลพร้อมแก้ไข");
        for (const input of entry.inputs.values()) input.disabled = !!entry.deleted;
        entry.addressSearch?.refresh();
        updateRecord(entry);
        for (const calendar of entry.calendars.values()) calendar.refresh();
        if (entry.kind === "contacts" && result.profile_contacts_available === false) {
          entry.save.disabled = true;
          status(entry.message, "ยังไม่เปิดบันทึกข้อมูลติดต่อเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ", "info");
        } else if (entry.kind === "contacts" && entry.message.textContent === "ยังไม่เปิดบันทึกข้อมูลติดต่อเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ") {
          status(entry.message, "ข้อมูลพร้อมแก้ไข");
        }
      }
      for (const entry of uploads.values()) { if (!entry.file || entry.revision === ownRevision) entry.revision = result.profile_revision; }
      syncDocumentControls();
      renderLists(ownRevision); renderDocuments();
      rebasingCurrentAddress = false;
      syncEnglishGender(); identityFeedback(); syncCurrentAddress();
      for (const control of saveButtons) control.disabled = busy || externalBusy();
      document.getElementById("profileLegacyAbilities").textContent = result.profile?.special_abilities || "ยังไม่ระบุ";
      document.getElementById("profileLegacySkills").textContent = result.profile?.related_skills || "ยังไม่ระบุ";
      onSnapshot?.(result);
    },
  };
  makeEntry({ key: "academic", kind: "academic", title: "ภาควิชา / คณะ / GPA ภาคเรียนที่ผ่านมา", fields: workspaceFields.academic, container: document.getElementById("profileAcademicExtras") });
  // Presentation groups reuse the exact field specifications and aggregate kinds.
  const thaiPersonal = ["gender", "national_id"];
  const basicPersonal = [...workspaceFields.basics.filter(field => !["blood_type", "medical_conditions", "allergies", "special_abilities", "related_skills"].includes(field.key)), ...workspaceFields.personal.filter(field => thaiPersonal.includes(field.key))];
  const basics = makeEntry({ key: "basics", kind: "basics", title: "ข้อมูลส่วนตัว", fields: basicPersonal, container: document.getElementById("profilePersonalExtras") });
  thaiIdentity = basics;
  // Keep prefix/gender and the existing Thai names in one two-column identity grid.
  for (const [key, target] of [["prefix", "profileThaiPrefixSlot"], ["gender", "profileThaiGenderSlot"]]) {
    const input = basics.inputs.get(key), slot = document.getElementById(target);
    if (slot) slot.append(input.closest(".form-group"));
    const changed = () => {
      capture(basics);
      if (key === "prefix" && input.value !== renderedPrefix) {
        renderedPrefix = input.value;
        const gender = basics.inputs.get("gender"), value = profileGenderForPrefix(input.value, gender.value);
        basics.draft.values.gender = value;
        updateChoice(gender, "gender", value); syncEnglishGender();
      }
      afterIdentityEvent();
      status(basics.message, basics.draft.dirty() ? "มีการแก้ไขที่ยังไม่บันทึก" : "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info"); notifyProfileChange(document, "edit");
    };
    input.addEventListener("input", changed); input.addEventListener("change", changed);
  }
  const age = document.getElementById("editAge")?.closest(".form-group");
  if (age) basics.inputs.get("birth_date").closest(".form-group").after(age);
  const identity = ["english_prefix", "english_first_name", "english_last_name"];
  const english = makeEntry({ key: "identity", kind: "personal", title: "Personal Information (English)", fields: workspaceFields.personal.filter(field => identity.includes(field.key)).map(field => ({ ...field, label: field.key === "english_prefix" ? "Title (English)" : field.key === "english_first_name" ? "First Name" : "Last Name" })), container: document.getElementById("profilePersonalExtras") });
  titleInput = english.inputs.get("english_prefix");
  titleHelp = node("p", "BLOCKED: คอลัมน์ Title (English) ยังไม่พร้อม ต้องได้รับอนุญาตและติดตั้งก่อนบันทึก Draft ในหน้านี้ยังอยู่", "profile-tab-help"); titleHelp.id = "profileEnglishTitleHelp";
  titleInput.setAttribute("aria-describedby", titleHelp.id); titleInput.closest(".form-group").append(titleHelp);
  titleInput.addEventListener("change", () => { capture(english); status(english.message, snapshot?.profile_english_prefix_available === true ? "มีการแก้ไขที่ยังไม่บันทึก" : "BLOCKED: Title ยังเป็น Draft ที่บันทึกไม่ได้", "info"); notifyProfileChange(document); });
  const genderGroup = node("div", undefined, "form-group"), genderLabelNode = node("label", "Gender (English)");
  englishGender = node("select"); englishGender.id = "profileEnglishGender"; englishGender.dataset.profileMirror = "gender"; genderLabelNode.htmlFor = englishGender.id;
  genderGroup.append(genderLabelNode, englishGender); english.inputs.get("english_first_name").closest(".form-group").before(genderGroup);
  const changeEnglishGender = () => {
    const canonical = basics.inputs.get("gender"); canonical.value = englishGender.value;
    capture(basics); afterIdentityEvent(); status(basics.message, basics.draft.dirty() ? "มีการแก้ไขที่ยังไม่บันทึก" : "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info"); notifyProfileChange(document, "edit");
  };
  englishGender.addEventListener("input", changeEnglishGender); englishGender.addEventListener("change", changeEnglishGender); syncEnglishGender();
  makeEntry({ key: "household", kind: "household", title: "ข้อมูลครอบครัว / ผู้ปกครอง", fields: workspaceFields.household, container: document.getElementById("profileFamilyExtras") });
  makeEntry({ key: "emergency", kind: "emergency", title: "ผู้ติดต่อฉุกเฉิน", fields: workspaceFields.emergency, container: document.getElementById("profileEmergencyExtras") });
  makeEntry({ key: "family", kind: "family", title: "ช่องทางติดต่อบิดา / มารดา", fields: workspaceFields.family.filter(field => !field.key.startsWith("emergency_")), container: document.getElementById("profileFamilyExtras") });
  makeEntry({ key: "emergencyExtra", kind: "family", title: "ข้อมูลผู้ติดต่อฉุกเฉินเพิ่มเติม", fields: workspaceFields.family.filter(field => field.key.startsWith("emergency_")), container: document.getElementById("profileEmergencyExtras") });
  const contact = makeEntry({ key: "legacyAddresses", kind: "legacyAddresses", title: "ข้อมูลติดต่อ", fields: workspaceFields.legacyAddresses.filter(field => field.type === "phone"), container: document.getElementById("profileContactExtras") });
  makeEntry({ key: "contacts", kind: "contacts", title: "LINE / Facebook", fields: workspaceFields.contacts, container: contact.form, embedded: true });
  listSection("profileFriendContact", "close_friends", "เพื่อนสนิท");
  for (const [addressType, title, legacyField] of [["registered", "ที่อยู่ตามทะเบียนบ้าน", "hometown_address"], ["current", "ที่อยู่ปัจจุบัน", "current_address"]]) {
    const address = makeEntry({ key: "address-" + addressType, kind: "addresses", title, fields: ["house_no", "moo", "road", "province", "district", "subdistrict", "postal_code"].map(key => workspaceFields.addresses.find(field => field.key === key)), addressType, container: document.getElementById("profileStructuredAddresses") });
    const text = makeEntry({ key: "address-text-" + addressType, kind: "legacyAddresses", title: title + " (ข้อความ)", fields: workspaceFields.legacyAddresses.filter(field => field.key === legacyField), container: address.form, embedded: true });
    if (addressType === "current") {
      const original = text.inputs.get(legacyField), group = original.closest(".form-group");
      original.readOnly = true;
      group.children[0].textContent = "ข้อความที่อยู่ปัจจุบันเดิม (เก็บรักษาข้อมูลที่บันทึกไว้)";
      const previewGroup = node("div", undefined, "form-group"), label = node("label", "ที่อยู่ปัจจุบัน (ข้อความ)");
      currentPreview = node("textarea"); currentPreview.id = "profileCurrentAddressPreview"; currentPreview.rows = 3; currentPreview.readOnly = true;
      label.htmlFor = currentPreview.id;
      currentAddressHelp = node("p", "สร้างจากช่องที่อยู่ปัจจุบันด้านบนโดยอัตโนมัติ", "profile-tab-help"); currentAddressHelp.id = "profileCurrentAddressHelp";
      currentPreview.setAttribute("aria-describedby", currentAddressHelp.id);
      previewGroup.append(label, currentPreview, currentAddressHelp); group.before(previewGroup);
      syncCurrentAddress();
    } else {
      const previewGroup = node("div", undefined, "form-group"), label = node("label", "ตัวอย่างที่อยู่ตามทะเบียนบ้าน");
      registeredPreview = node("textarea"); registeredPreview.id = "profileRegisteredAddressPreview"; registeredPreview.rows = 3; registeredPreview.readOnly = true; label.htmlFor = registeredPreview.id;
      const help = node("p", "สร้างจากช่องย่อยด้านบน โดยไม่เขียนทับข้อความที่อยู่เดิม", "profile-tab-help"); help.id = "profileRegisteredAddressHelp";
      registeredPreview.setAttribute("aria-describedby", help.id); previewGroup.append(label, registeredPreview, help);
      text.form.before(previewGroup);
    }
  }
  listSection("profileEducationRecords", "education", "ประวัติการศึกษา"); listSection("profileTrainingRecords", "training", "ประวัติฝึกอบรม / ดูงาน / ฝึกงาน");
  listSection("profileComputerSkills", "skills", "ทักษะคอมพิวเตอร์", "computer"); listSection("profileLanguageSkills", "skills", "ความสามารถด้านภาษา", "language");
  makeEntry({ key: "abilities", kind: "basics", title: "ทักษะและความสามารถเพิ่มเติม", fields: workspaceFields.basics.filter(field => ["special_abilities", "related_skills"].includes(field.key)), container: document.getElementById("profileAbilities") });
  makeEntry({ key: "health", kind: "basics", title: "ข้อมูลสุขภาพ", fields: workspaceFields.basics.filter(field => ["blood_type", "medical_conditions", "allergies"].includes(field.key)), container: document.getElementById("profileHealthExtras") });
  makeEntry({ key: "personal", kind: "personal", title: "ข้อมูลเพิ่มเติม / ใบขับขี่ / ทหาร", fields: workspaceFields.personal.filter(field => ![...identity, ...thaiPersonal].includes(field.key)), container: document.getElementById("profileHealthExtras") });
  for (const type of documentTypes) documentSection(...type);
  for (const control of saveButtons) control.addEventListener("click", saveAll);
  document.getElementById("profileReviewAll")?.addEventListener("click", () => {
    if (busy || externalBusy() || !snapshot) return;
    showConfirmModal({ title: "ตรวจฉบับล่าสุดและเก็บค่าที่แก้?", message: "โหลดประวัติล่าสุดแล้วคงเฉพาะค่าที่คุณแก้ไว้ รวมรายการรอลบ กรุณาตรวจความต่างก่อนกดบันทึกอีกครั้ง", confirmLabel: "โหลดและตรวจความต่าง", onConfirm: async () => {
      if (busy || externalBusy()) return;
      if (!await reload()) throw new Error("โหลดไม่สำเร็จ Draft ยังอยู่");
      rebasingCurrentAddress = true;
      for (const entry of entries.values()) {
        if (entry.kind === "documents") continue;
        capture(entry); const values = { ...entry.draft.values }, baseline = { ...entry.draft.baseline }, row = getRow(entry);
        if (entry.isNew) { entry.draft.revision = snapshot.profile_revision; continue; }
        if (entry.id && !row && !entry.addressType) { showDifferences(entry); continue; }
        entry.draft.reset(row || {}, snapshot.profile_revision);
        for (const spec of entry.fields) if (!Object.is(canonicalWorkspaceValue(spec, values[spec.key]), baseline[spec.key])) entry.draft.values[spec.key] = values[spec.key];
        updateInputs(entry); clearConflict(entry); showDifferences(entry);
      }
      legacyConflict = false; saveFailed = false;
      rebasingCurrentAddress = false;
      syncCurrentAddress(); rebaseLegacy(); syncLegacyProfile(); status(globalStatus, "โหลดฉบับล่าสุดแล้ว ตรวจความต่างทุกหมวดและรายการรอลบก่อนบันทึก", "info"); notifyProfileChange(document, "ready");
    } });
  });
  async function reloadPreservingDraft() {
    if (busy || externalBusy()) return;
    const revision = snapshot?.profile_revision;
    status(globalStatus, "กำลังโหลดข้อมูลล่าสุด", "loading");
    const result = await reload();
    const committedDuringReload = !!revision && snapshot?.profile_revision !== revision;
    status(globalStatus, result ? "โหลดข้อมูลล่าสุดแล้ว Draft ที่ยังไม่บันทึกยังอยู่" : committedDuringReload ? "ใช้ฉบับที่บันทึกล่าสุดแล้ว Draft ที่ยังไม่บันทึกยังอยู่" : "โหลดข้อมูลไม่สำเร็จ Draft ยังอยู่", result || committedDuringReload ? "success" : "error");
    if (result || committedDuringReload) notifyProfileChange(document, "ready");
  }
  document.getElementById("profileRetryLoad")?.addEventListener("click", reloadPreservingDraft);
  renderDocuments();
  mounted.set(root, controller); return controller;
}
