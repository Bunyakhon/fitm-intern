import { workspaceFields, ProfileSectionDraft, validateProfileDocument, canonicalWorkspaceValue } from "./studentProfileWorkspaceDraft.js";
import { updateMyStudentProfile, updateStudentInfo, createStudentProfileRecord, updateStudentProfileRecord, deleteStudentProfileRecord,
  uploadStudentProfileDocument, updateStudentProfileDocument, deleteStudentProfileDocument, downloadStudentProfileDocument } from "../api/studentProfile.api.js";
import { showToast, showConfirmModal, setButtonLoading } from "../ui/feedback.js";
import { profileMessage, profileFieldError, clearProfileErrors, notifyProfileChange } from "./studentProfileFeedback.js";

const mounted = new WeakMap();
const documentTypes = [["transcript", "ใบแสดงผลการเรียน", "fa-file-contract"], ["national_id_copy", "สำเนาบัตรประชาชน", "fa-id-card"],
  ["student_id_copy", "สำเนาบัตรนักศึกษา", "fa-address-card"], ["supporting_other", "เอกสารอื่น", "fa-paperclip"], ["external_profile_pdf", "Profile PDF ต้นฉบับ", "fa-file-pdf"]];
export function mountStudentProfileWorkspace({ document, onCommit, reload, externalBusy = () => false, onUnauthorized = () => {}, onSnapshot }) {
  const root = document.getElementById("panel-profile");
  if (!root) return null;
  if (mounted.has(root)) return mounted.get(root);
  const entries = new Map(), uploads = new Map(), lists = new Map();
  let snapshot = null, busy = false, serial = 0;
  const node = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
  const button = (label, action, className = "btn-secondary") => { const element = node("button", label, className); element.type = "button"; element.addEventListener("click", action); return element; };
  const status = profileMessage;
  const globalStatus = document.getElementById("profileWorkspaceStatus");
  const getRow = entry => {
    if (["personal", "family"].includes(entry.kind)) return snapshot?.profile || {};
    if (entry.kind === "academic") return snapshot?.student || {};
    if (entry.addressType) return snapshot?.addresses?.find(row => row.address_type === entry.addressType);
    return snapshot?.[entry.kind]?.find(row => row.id === entry.id);
  };
  function capture(entry) {
    for (const [key, input] of entry.inputs) entry.draft.values[key] = input.value;
  }
  function updateInputs(entry) {
    for (const [key, input] of entry.inputs) input.value = entry.draft.values[key] ?? "";
    updateLicense(entry);
    notifyProfileChange(document);
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
      const item = node("div"); item.append(node("dt", spec.label), node("dd", "ค่าที่คุณแก้: " + (mine ?? "ว่าง")), node("dd", "ที่บันทึกแล้ว: " + (theirs ?? "ว่าง"))); content.append(item);
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
        status(entry.message, "โหลดฉบับล่าสุดแล้ว กรุณาตรวจค่าก่อนบันทึก", "info");
        notifyProfileChange(document, "ready");
      },
    });
  }
  async function perform(target, message, revision, action, after) {
    if (busy || externalBusy()) { status(message, "กำลังบันทึกข้อมูลส่วนอื่น กรุณารอสักครู่", "info"); return false; }
    if (!revision) { status(message, "กรุณาโหลดข้อมูลประวัติล่าสุดก่อนบันทึก Draft ยังอยู่", "error"); return false; }
    busy = true; setButtonLoading(target, true, "กำลังบันทึก...");
    notifyProfileChange(document);
    status(message, "กำลังบันทึก...", "loading");
    try {
      const result = await action();
      if (!result?.student || !result.profile_revision) throw new Error("ยังยืนยันผลบันทึกไม่ได้ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง");
      after?.(result); controller.acceptSnapshot(result, { ownRevision: revision }); onCommit?.(result, revision);
      status(message, "บันทึกเรียบร้อยแล้ว · หากแก้ไขเพิ่มระหว่างบันทึก กรุณาบันทึกส่วนนั้นอีกครั้ง", "success"); notifyProfileChange(document, "saved"); showToast("บันทึกข้อมูลประวัติเรียบร้อยแล้ว", "success"); return true;
    } catch (error) {
      if ([401, 403].includes(error.status)) { onUnauthorized(error); return false; }
      if (error.status === 409 && error.data?.student && error.data.profile_revision) controller.acceptSnapshot(error.data);
      status(message, error.status === 409 ? "ประวัติเปลี่ยนจากหน้าต่างอื่น Draft ยังอยู่ โปรดตรวจความแตกต่างก่อนบันทึก" : error.status === 428 ? "ต้องโหลดประวัติล่าสุดก่อนบันทึก Draft ยังอยู่" : !error.status || error.status >= 500 ? "ยังยืนยันผลบันทึกไม่ได้ กรุณาโหลดประวัติล่าสุดและตรวจค่าก่อนลองอีกครั้ง Draft ยังอยู่" : error.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
      return false;
    } finally { busy = false; setButtonLoading(target, false); for (const section of lists.values()) section.add.disabled = !snapshot; notifyProfileChange(document); }
  }
  function fieldControl(entry, spec) {
    const group = node("div", undefined, "form-group");
    const id = "profileWorkspace-" + entry.key.replace(/[^\w-]/g, "-") + "-" + spec.key;
    const label = node("label", spec.label + (spec.required ? " (จำเป็น)" : " (ถ้ามี)")); label.htmlFor = id;
    const input = node(spec.options ? "select" : spec.type === "textarea" ? "textarea" : "input"); input.id = id; input.name = spec.key;
    if (spec.options) {
      const empty = node("option", spec.required ? "เลือก" + spec.label : "ยังไม่ระบุ"); empty.value = ""; input.append(empty);
      for (const [value, title] of spec.options) { const option = node("option", title); option.value = value; input.append(option); }
    } else if (spec.type === "textarea") input.rows = 3;
    else {
      input.type = spec.type === "date" ? "date" : ["integer", "gpa"].includes(spec.type) ? "number" : spec.type === "phone" ? "tel" : "text";
      if (spec.type === "integer") { input.min = spec.min; input.max = spec.limit; input.step = "1"; }
      if (spec.type === "gpa") { input.min = "0"; input.max = "4"; input.step = "0.01"; }
    }
    if (Number.isFinite(spec.max)) input.maxLength = spec.max;
    input.required = !!spec.required; input.disabled = !snapshot; group.append(label, input); entry.inputs.set(spec.key, input); return group;
  }
  function makeEntry({ key, kind, title, fields, row, id, addressType, isNew = false, container }) {
    const form = node("form", undefined, "info-card profile-entry"); form.noValidate = true; form.dataset.profileEntry = key;
    const entry = { key, kind, title, fields, id, addressType, isNew, form, documentType: row?.file_type, inputs: new Map(), draft: new ProfileSectionDraft(fields, row, snapshot?.profile_revision) };
    const heading = node("h3", title, "card-title"), grid = node("div", undefined, "profile-entry-grid");
    const icons = { academic: "fa-graduation-cap", personal: "fa-circle-user", family: "fa-people-roof", addresses: "fa-location-dot", education: "fa-school", training: "fa-certificate", skills: "fa-star", documents: "fa-file-lines" };
    const icon = node("i", undefined, "fa-solid " + icons[kind]); icon.setAttribute("aria-hidden", "true"); heading.prepend(icon);
    for (const spec of fields) grid.append(fieldControl(entry, spec));
    entry.message = node("p", "โหลดข้อมูลประวัติก่อนเริ่มแก้ไข", "message"); entry.message.setAttribute("role", "status"); entry.message.setAttribute("aria-live", "polite");
    entry.save = node("button", "บันทึก" + title, "btn-primary"); entry.save.type = "submit"; entry.save.disabled = !snapshot;
    entry.review = button("ตรวจความต่าง / เก็บค่าที่แก้", () => review(entry, true)); entry.review.hidden = true;
    entry.discard = button("โหลดล่าสุด / ทิ้งการแก้ไข", () => review(entry, false)); entry.discard.hidden = true;
    entry.difference = node("div", undefined, "profile-difference"); entry.difference.hidden = true;
    const actions = node("div", undefined, "profile-entry-actions"); actions.append(entry.save);
    if (kind !== "documents" && (isNew || (id && !addressType))) { entry.remove = button(isNew ? "ยกเลิกรายการใหม่" : "ลบรายการ", () => removeEntry(entry), "btn-secondary profile-danger"); actions.append(entry.remove); }
    actions.append(entry.review, entry.discard);
    const help = node("p", "บันทึกเฉพาะหมวดนี้ ช่องที่ระบุว่าถ้ามีสามารถเว้นว่างได้", "profile-tab-help");
    form.append(heading, help, grid, entry.difference, actions, entry.message);
    if (kind === "personal") form.append(node("p", "เลขบัตรประชาชนยังไม่เปิดให้กรอก อยู่ระหว่างยืนยันนโยบาย", "profile-tab-help"));
    form.addEventListener("input", () => { capture(entry); status(entry.message, entry.draft.dirty() || entry.isNew ? "มีการแก้ไขที่ยังไม่บันทึก" : "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info"); });
    form.addEventListener("change", event => {
      capture(entry); updateLicense(entry);
      if (event.target.name === "has_driving_license" && event.target.value === "false" && fields.some(spec => spec.license && entry.draft.values[spec.key])) {
        showConfirmModal({ title: "ล้างรายละเอียดใบขับขี่?", message: "คุณเลือกไม่มีใบขับขี่ รายละเอียดเดิมยังไม่ได้ลบ หากยืนยันจะล้างเลขที่ ประเภท และวันหมดอายุใน Draft แล้วกดบันทึกเพื่อยืนยันอีกครั้ง",
          confirmLabel: "ล้างรายละเอียดใน Draft", onConfirm: () => { for (const spec of fields.filter(spec => spec.license)) entry.draft.values[spec.key] = null; updateInputs(entry); } });
      }
    });
    form.addEventListener("submit", event => { event.preventDefault(); event.stopPropagation(); saveEntry(entry); });
    entries.set(key, entry); container?.append(form); updateInputs(entry); return entry;
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
      : ["personal", "family"].includes(entry.kind) ? updateMyStudentProfile(patch, revision)
      : entry.kind === "documents" ? updateStudentProfileDocument(entry.id, patch, revision)
      : entry.id ? updateStudentProfileRecord(entry.kind, entry.id, patch, revision)
      : createStudentProfileRecord(entry.kind, { ...patch, ...(entry.addressType ? { address_type: entry.addressType } : {}) }, revision);
    const saved = await perform(entry.save, entry.message, revision, action, result => {
      capture(entry);
      const row = entry.kind === "academic" ? result.student : ["personal", "family"].includes(entry.kind) ? result.profile : entry.kind === "documents" ? result.documents.find(row => row.id === entry.id) : result.record;
      entry.draft.accept(row || {}, result.profile_revision, { ownRevision: revision, sent });
      if (result.record) { entry.id = result.record.id; entry.isNew = false; if (entry.remove) entry.remove.textContent = "ลบรายการ"; }
      updateInputs(entry); clearConflict(entry);
    });
    if (!saved && revision) { entry.draft.conflict = /หน้าต่างอื่น|โหลดประวัติล่าสุด/.test(entry.message.textContent); entry.review.hidden = !entry.draft.conflict; entry.discard.hidden = !entry.draft.conflict; if (entry.draft.conflict) showDifferences(entry); }
  }
  function removeEntry(entry) {
    if (busy || externalBusy()) return;
    showConfirmModal({ title: entry.isNew ? "ยกเลิกรายการใหม่?" : "ลบรายการนี้?", message: "ลบเฉพาะรายการนี้ การแก้ไขในรายการอื่นยังคงอยู่", confirmLabel: entry.isNew ? "ยกเลิกรายการ" : "ลบรายการ",
      onConfirm: async () => {
        if (!entry.id) { entries.delete(entry.key); entry.form.remove(); notifyProfileChange(document, "edit"); return; }
        const revision = entry.draft.revision;
        const saved = await perform(entry.save, entry.message, revision, () => deleteStudentProfileRecord(entry.kind, entry.id, revision), () => { entries.delete(entry.key); entry.form.remove(); });
        if (!saved) throw new Error(entry.message.textContent);
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
      if (busy || !snapshot) return;
      empty.hidden = true;
      const entry = makeEntry({ key: "new-" + (++serial), kind, title, fields: workspaceFields[kind], row: category ? { category } : {}, isNew: true, container: list }); entry.inputs.values().next().value?.focus();
    }); add.disabled = true; header.append(add); section.append(header, empty, list); container.append(section);
    lists.set(containerId, { kind, category, title, list, empty, add });
  }
  function renderLists(ownRevision) {
    for (const section of lists.values()) {
      section.add.disabled = !snapshot || busy;
      const rows = (snapshot?.[section.kind] || []).filter(row => !section.category || row.category === section.category);
      for (const row of rows) {
        let entry = [...entries.values()].find(entry => entry.kind === section.kind && entry.id === row.id);
        if (!entry) entry = makeEntry({ key: section.kind + "-" + row.id, kind: section.kind, title: section.title, fields: workspaceFields[section.kind], row, id: row.id, container: section.list });
        else if (entry.form.parentElement !== section.list) section.list.append(entry.form);
      }
      section.empty.hidden = section.list.children.length > 0;
    }
  }
  function renderDocuments() {
    for (const entry of uploads.values()) {
      const rows = (snapshot?.documents || []).filter(row => row.file_type === entry.type);
      entry.list.replaceChildren();
      if (!rows.length) entry.list.append(node("p", "ยังไม่มีเอกสาร", "profile-empty-state"));
      for (const file of rows) {
        const row = node("article", undefined, "profile-document-row");
        const meta = node("div", undefined, "profile-document-meta");
        meta.append(node("strong", file.document_label || file.original_name), node("span", file.original_name), node("small", "อัปโหลดแล้ว · รุ่น " + file.document_version + " · " + new Date(file.createdAt).toLocaleDateString("th-TH")));
        const actions = node("div", undefined, "profile-entry-actions");
        actions.append(button("ดาวน์โหลด", async event => {
          const target = event.currentTarget; setButtonLoading(target, true, "กำลังดาวน์โหลด...");
          try { const blob = await downloadStudentProfileDocument(file.id); const url = URL.createObjectURL(blob); const link = node("a"); link.href = url; link.download = file.original_name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
          catch (error) { status(entry.message, error.message || "ดาวน์โหลดไม่สำเร็จ", "error"); if ([401, 403].includes(error.status)) onUnauthorized(error); }
          finally { setButtonLoading(target, false); }
        }));
        actions.append(button("แก้ชื่อกำกับ", () => {
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
  function documentSection(type, title, icon) {
    const container = document.getElementById("profileDocumentCards"); if (!container) return;
    const form = node("section", undefined, "info-card profile-document-card"); form.dataset.documentType = type;
    const uploadForm = node("form", undefined, "profile-document-upload"); uploadForm.noValidate = true;
    const heading = node("h3", title, "card-title"); const symbol = node("i", undefined, "fa-solid " + icon); symbol.setAttribute("aria-hidden", "true"); heading.prepend(symbol);
    const list = node("div", undefined, "profile-document-list");
    const label = node("label", "เลือกไฟล์" + title); const input = node("input"); input.type = "file"; input.disabled = true; input.accept = type === "external_profile_pdf" ? ".pdf" : ".pdf,.jpg,.jpeg,.png"; input.id = "profileDocument-" + type; label.htmlFor = input.id;
    const labelInput = node("input"); labelInput.type = "text"; labelInput.maxLength = 255; labelInput.placeholder = "ชื่อกำกับเอกสาร"; labelInput.id = input.id + "-label";
    const caption = node("label", type === "supporting_other" ? "ชื่อเอกสารอื่น (จำเป็น)" : "ชื่อกำกับ (ถ้ามี)"); caption.htmlFor = labelInput.id;
    const save = node("button", "อัปโหลด" + title, "btn-primary"); save.type = "submit"; save.disabled = true;
    const message = node("p", "โหลดข้อมูลก่อนอัปโหลด", "message"); message.setAttribute("role", "status"); message.setAttribute("aria-live", "polite");
    const reviewButton = button("ตรวจข้อมูลล่าสุดก่อนอัปโหลด", () => {
      if (busy || externalBusy()) return;
      showConfirmModal({ title: "โหลดฉบับล่าสุดก่อนอัปโหลด?", message: "ไฟล์ที่เลือกยังอยู่ เมื่อโหลดแล้วโปรดตรวจเอกสารปัจจุบันและกดอัปโหลดอีกครั้ง", confirmLabel: "โหลดล่าสุดและเก็บไฟล์", onConfirm: async () => {
        if (!await reload()) throw new Error("โหลดไม่สำเร็จ ไฟล์ที่เลือกยังอยู่"); entry.revision = snapshot.profile_revision; status(message, "โหลดข้อมูลแล้ว ตรวจเอกสารก่อนกดอัปโหลดอีกครั้ง");
      } });
    });
    const entry = { type, form, list, input, labelInput, save, message, revision: null, file: null };
    input.addEventListener("change", () => { entry.file = input.files?.[0] || null; entry.revision = snapshot?.profile_revision; status(message, entry.file ? "เลือกไฟล์แล้ว ยังไม่อัปโหลด" : "ยังไม่เลือกไฟล์"); });
    uploadForm.addEventListener("submit", async event => {
      event.preventDefault();
      clearProfileErrors(uploadForm);
      try { validateProfileDocument(entry.file, type, labelInput.value); }
      catch (error) { profileFieldError(entry.file && type === "supporting_other" && !labelInput.value.trim() ? labelInput : input, error.message); status(message, error.message, "error"); return; }
      const body = new FormData(); body.append("document", entry.file); if (labelInput.value.trim()) body.append("document_label", labelInput.value.trim());
      input.disabled = true; labelInput.disabled = true;
      try { await perform(save, message, entry.revision, () => uploadStudentProfileDocument(type, body, entry.revision, progress => {
        status(message, progress.total ? "ส่งไฟล์ " + Math.round(progress.loaded / progress.total * 100) + "% · รอระบบยืนยันการบันทึก" : "กำลังส่งไฟล์และรอระบบยืนยันการบันทึก", "loading");
      }), () => { entry.file = null; input.value = ""; labelInput.value = ""; }); }
      finally { input.disabled = false; labelInput.disabled = false; }
    });
    uploadForm.append(label, input, caption, labelInput, node("p", type === "external_profile_pdf" ? "PDF ไม่เกิน 10MB · เก็บต้นฉบับเท่านั้น ไม่มีการนำเข้าข้อมูล" : "PDF/JPEG/PNG ไม่เกิน 10MB · หนึ่งไฟล์ต่อการอัปโหลด", "profile-tab-help"), save, reviewButton);
    form.append(heading, list, uploadForm, message);
    uploads.set(type, entry); container.append(form);
  }
  const controller = {
    get busy() { return busy; },
    get snapshot() { return snapshot; },
    hasChanges() { for (const entry of entries.values()) { capture(entry); if (entry.isNew || entry.draft.dirty()) return true; } return [...uploads.values()].some(entry => entry.file || entry.labelInput.value); },
    acceptSnapshot(result, { ownRevision } = {}) {
      if (!result?.student || !result.profile_revision) return;
      for (const entry of entries.values()) capture(entry);
      snapshot = result;
      for (const entry of [...entries.values()]) {
        const row = getRow(entry);
        if (entry.id && !row && !entry.addressType) {
          if (entry.draft.dirty() || entry.draft.conflict) { entry.draft.conflict = true; entry.review.hidden = false; entry.discard.hidden = false; status(entry.message, "รายการนี้ไม่อยู่ในข้อมูลล่าสุด Draft ยังอยู่ กรุณาเลือกทิ้ง Draft หรือเพิ่มรายการใหม่", "error"); }
          else { entries.delete(entry.key); entry.form.remove(); }
          continue;
        }
        if (entry.isNew) { if (!entry.draft.revision || entry.draft.revision === ownRevision) entry.draft.revision = result.profile_revision; }
        else if (entry.draft.accept(row || {}, result.profile_revision, { ownRevision })) { updateInputs(entry); clearConflict(entry); }
        if (entry.addressType) entry.id = row?.id;
        entry.save.disabled = false; if (entry.message.textContent === "โหลดข้อมูลประวัติก่อนเริ่มแก้ไข") status(entry.message, "ข้อมูลพร้อมแก้ไข");
        for (const input of entry.inputs.values()) input.disabled = false;
      }
      for (const entry of uploads.values()) { if (!entry.file || entry.revision === ownRevision) entry.revision = result.profile_revision; entry.save.disabled = false; if (!busy) entry.input.disabled = false; if (entry.message.textContent === "โหลดข้อมูลก่อนอัปโหลด") status(entry.message, "เลือกไฟล์เพื่ออัปโหลด"); }
      renderLists(ownRevision); renderDocuments();
      document.getElementById("profileLegacyAbilities").textContent = result.profile?.special_abilities || "ยังไม่ระบุ";
      document.getElementById("profileLegacySkills").textContent = result.profile?.related_skills || "ยังไม่ระบุ";
      onSnapshot?.(result);
    },
  };
  makeEntry({ key: "academic", kind: "academic", title: "ภาควิชา / คณะ / GPA ภาคเรียนที่ผ่านมา", fields: workspaceFields.academic, container: document.getElementById("profileAcademicExtras") });
  makeEntry({ key: "personal", kind: "personal", title: "ข้อมูลส่วนตัวเพิ่มเติม / ใบขับขี่ / ทหาร", fields: workspaceFields.personal, container: document.getElementById("profilePersonalExtras") });
  makeEntry({ key: "family", kind: "family", title: "ข้อมูลครอบครัวและฉุกเฉินเพิ่มเติม", fields: workspaceFields.family, container: document.getElementById("profileFamilyExtras") });
  for (const [addressType, title] of [["registered", "ที่อยู่ตามทะเบียนบ้าน"], ["current", "ที่อยู่ปัจจุบัน"]]) makeEntry({ key: "address-" + addressType, kind: "addresses", title, fields: workspaceFields.addresses, addressType, container: document.getElementById("profileStructuredAddresses") });
  document.getElementById("profileStructuredAddresses")?.prepend(button("ใช้ที่อยู่เดียวกับทะเบียนบ้าน", () => {
    showConfirmModal({ title: "คัดลอกที่อยู่ทะเบียนบ้านไปที่อยู่ปัจจุบัน?", message: "จะคัดลอกค่าที่แสดงในทะเบียนบ้านไปยัง Draft ที่อยู่ปัจจุบัน ค่าปัจจุบันจะถูกแทนเฉพาะเมื่อคุณยืนยัน และยังต้องกดบันทึกที่อยู่ปัจจุบัน", confirmLabel: "คัดลอกค่าใน Draft", onConfirm: () => {
      const registered = entries.get("address-registered"), current = entries.get("address-current"); capture(registered); capture(current); current.draft.values = { ...registered.draft.values }; updateInputs(current); status(current.message, "คัดลอกแล้ว กรุณาตรวจสอบและกดบันทึก", "info");
    } });
  }));
  listSection("profileEducationRecords", "education", "ประวัติการศึกษา"); listSection("profileTrainingRecords", "training", "ประวัติฝึกอบรม / ดูงาน / ฝึกงาน");
  listSection("profileComputerSkills", "skills", "ทักษะคอมพิวเตอร์", "computer"); listSection("profileLanguageSkills", "skills", "ความสามารถด้านภาษา", "language");
  for (const type of documentTypes) documentSection(...type);
  document.getElementById("profileWorkspaceReload")?.addEventListener("click", async () => {
    if (busy || externalBusy()) return;
    const revision = snapshot?.profile_revision;
    status(globalStatus, "กำลังโหลดข้อมูลล่าสุด", "loading");
    const result = await reload();
    const committedDuringReload = !!revision && snapshot?.profile_revision !== revision;
    status(globalStatus, result ? "โหลดข้อมูลล่าสุดแล้ว Draft ที่ยังไม่บันทึกยังอยู่" : committedDuringReload ? "ใช้ฉบับที่บันทึกล่าสุดแล้ว Draft ที่ยังไม่บันทึกยังอยู่" : "โหลดข้อมูลไม่สำเร็จ Draft ยังอยู่", result || committedDuringReload ? "success" : "error");
    if (result || committedDuringReload) notifyProfileChange(document, "ready");
  });
  mounted.set(root, controller); return controller;
}
