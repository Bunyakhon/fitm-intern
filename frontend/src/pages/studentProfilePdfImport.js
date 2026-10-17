import { previewStudentProfilePdf, commitStudentProfilePdf, getStudentProfilePdfImportStatus, reviewStudentProfilePdfImport, getStudentProfilePdfImportHistory } from "../api/studentProfile.api.js";
import { pdfFieldSpecs, buildProfilePdfChanges, importRecordIdentity, normalizeImportField } from "./studentProfilePdfDraft.js";
import { showToast, showConfirmModal, setButtonLoading } from "../ui/feedback.js";
import { profileMessage, profileFieldError, clearProfileErrors, notifyProfileChange } from "./studentProfileFeedback.js";
const mounted = new WeakMap();
const titles = { addresses: "ที่อยู่", education: "ประวัติการศึกษา", training: "ฝึกอบรม / ดูงาน / ฝึกงาน", skills: "ทักษะ" };
const warningLabels = {
  LICENSE_CHECKBOX_REVIEW_REQUIRED: "Checkbox ใบขับขี่ยังอ่านไม่ได้อย่างแน่นอน กรุณาตรวจและกรอกเอง",
  MILITARY_CHECKBOX_REVIEW_REQUIRED: "Checkbox ภาวะทหารยังอ่านไม่ได้อย่างแน่นอน กรุณาตรวจและกรอกเอง",
  SKILL_RATING_REVIEW_REQUIRED: "บางทักษะอ่านระดับไม่ได้ เครื่องหมายข้างชื่อทักษะไม่ถูกถือเป็นระดับความสามารถ",
  SKILL_TABLE_UNREADABLE: "ตารางทักษะอ่านไม่ครบ กรุณากรอกหรือแก้ไขเอง",
  OCR_SKILL_GRID_REVIEW_REQUIRED: "ตารางทักษะในภาพสแกนยังไม่สามารถจับคู่ระดับได้อย่างปลอดภัย กรุณากรอกเอง",
  ENGLISH_FULL_NAME_NEEDS_MANUAL_SPLIT: "ชื่อภาษาอังกฤษใน PDF เป็นชื่อรวม กรุณาแยกชื่อ/นามสกุลในแบบฟอร์มด้วยตนเอง",
  OCR_VALUES_REQUIRE_REVIEW: "ใช้ OCR ภายในเครื่อง โปรดตรวจทุกค่าจากภาพสแกนก่อนเลือกใช้ ไม่มีการบันทึกอัตโนมัติ",
  STUDENT_ID_NOT_FOUND: "PDF ไม่มีรหัสนักศึกษาที่อ่านได้ โปรดตรวจว่าต้นฉบับเป็นของคุณก่อนยืนยัน",
  BLOCKED_ID_SIGNATURE_WORKFLOW_NOT_IMPORTED: "ไม่ได้นำเข้าเลขบัตรประชาชน ลายเซ็น การรับรอง หรือข้อมูล Approval Workflow",
};
export function mountStudentProfilePdfImport({ document, getSnapshot, externalBusy = () => false, onCommit, onUnauthorized = () => {} }) {
  const root = document.getElementById("profilePdfImport"); if (!root) return null;
  if (mounted.has(root)) return mounted.get(root);
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
  const button = (text, handler, className = "btn-secondary") => { const el = node("button", text, className); el.type = "button"; el.addEventListener("click", handler); return el; };
  const message = document.getElementById("profilePdfMessage"), body = document.getElementById("profilePdfBody"), fileInput = document.getElementById("profilePdfFile"), previewArea = document.getElementById("profilePdfPreview"), historyArea = document.getElementById("profilePdfHistory");
  let file = null, preview = null, fields = [], records = [], committing = false, processing = false, uncertain = false, epoch = 0, initialized = false;
  const status = (text, type = "info") => profileMessage(message, text, type);
  const manualButton = document.getElementById("profilePdfChooseManual"), importButton = document.getElementById("profilePdfChooseImport");
  function step(number) {
    for (const item of root.querySelectorAll("[data-import-step]")) {
      const value = Number(item.dataset.importStep);
      item.dataset.state = value < number ? "done" : value === number ? "current" : "pending";
      if (value === number) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
    }
  }
  function method(importing) {
    body.hidden = !importing;
    importButton.setAttribute("aria-expanded", String(importing));
    importButton.setAttribute("aria-pressed", String(importing));
    manualButton.setAttribute("aria-pressed", String(!importing));
    if (importing) fileInput.focus();
    else { document.getElementById("profilePersonalTab")?.click(); document.getElementById("studentFirstNameInput")?.focus(); }
  }
  const display = value => value == null || value === "" ? "ยังไม่ระบุ" : value === true ? "มี" : value === false ? "ไม่มี" : String(value);
  const extractButton = document.getElementById("profilePdfExtract"), saveButton = document.getElementById("profilePdfSave"), cancelButton = document.getElementById("profilePdfCancel"), reviewButton = document.getElementById("profilePdfReview"), verifyButton = document.getElementById("profilePdfVerify");
  function controls() { fileInput.disabled = committing || processing; extractButton.disabled = !file || committing || processing; saveButton.disabled = !preview || committing || processing || uncertain; cancelButton.disabled = committing; reviewButton.hidden = !preview; verifyButton.hidden = !uncertain; }
  function capture() {
    for (const entry of fields) { entry.mode = entry.select.value; entry.value = entry.input.value; }
    for (const row of records) { row.action = row.actionInput.value; row.id = row.targetInput.value; for (const [key, input] of row.inputs) row.values[key] = input.value; }
  }
  function clear({ preserveFileInput = false } = {}) {
    ++epoch; file = null; preview = null; fields = []; records = []; uncertain = false; processing = false;
    if (!preserveFileInput) fileInput.value = "";
    previewArea.replaceChildren(); setButtonLoading(extractButton, false); controls(); step(1); notifyProfileChange(document);
  }
  async function history() {
    try {
      const result = await getStudentProfilePdfImportHistory(); historyArea.replaceChildren();
      if (!result.imports.length) { historyArea.append(node("p", "ยังไม่มี PDF ที่ยืนยันนำเข้า", "profile-tab-help")); return; }
      historyArea.append(node("h4", "ต้นฉบับที่ยืนยันนำเข้าล่าสุด"));
      for (const row of result.imports) historyArea.append(node("p", row.original_name + " · รุ่น " + row.document_version + " · นำเข้าแล้ว · " + new Date(row.extracted_at).toLocaleString("th-TH") + (row.is_current ? " · ต้นฉบับปัจจุบัน" : " · รุ่นก่อนหน้า"), "profile-tab-help"));
    } catch { historyArea.replaceChildren(node("p", "ยังโหลดประวัติการนำเข้าไม่ได้ ตรวจต้นฉบับได้ในแท็บเอกสารประกอบ", "profile-tab-help")); }
  }
  function inputFor(spec, id, value) {
    const input = node(spec.options ? "select" : spec.type === "textarea" ? "textarea" : "input"); input.id = id; input.name = spec.key;
    if (spec.options) {
      input.append(new Option("ยังไม่ระบุ", ""));
      for (const [value, label] of spec.options) input.append(new Option(label, value));
      if (value != null && !spec.options.some(([option]) => option === String(value))) input.append(new Option("ค่าจาก PDF (ต้องตรวจ): " + String(value), String(value)));
    } else {
      // Text allows malformed OCR dates/numbers to remain visible for correction.
      input.type = "text"; if (["gpa", "integer", "decimal"].includes(spec.type)) input.inputMode = "decimal";
      if (Number.isFinite(spec.max)) input.maxLength = spec.max;
    }
    input.value = value == null ? "" : String(value); return input;
  }
  function scalarRow(candidate, index) {
    const spec = pdfFieldSpecs[candidate.scope]?.[candidate.key]; if (!spec) return;
    const entry = { ...candidate, mode: "keep" }, card = node("div", undefined, "profile-pdf-field"); card.dataset.importField = candidate.scope + "." + candidate.key;
    card.append(node("h4", spec.label));
    entry.old = node("p", "ค่าเดิม: " + display(preview.snapshot[candidate.scope]?.[candidate.key]), "profile-pdf-current"); card.append(entry.old);
    card.append(node("p", "ค่าที่อ่านได้จาก PDF: " + display(candidate.value), "profile-pdf-extracted"));
    const label = node("label", "ค่าจาก PDF / แก้ไขก่อนบันทึก"); label.htmlFor = "pdfImportField-" + index;
    entry.input = inputFor(spec, label.htmlFor, candidate.value); entry.input.disabled = true;
    entry.select = node("select"); entry.select.id = "pdfImportDecision-" + index; entry.select.append(new Option("เก็บค่าปัจจุบัน / ข้าม", "keep"), new Option("ใช้ค่าจาก PDF", "pdf"), new Option("แก้ไขค่าแล้วใช้", "edit"));
    const decisionLabel = node("label", "การตัดสินใจ"); decisionLabel.htmlFor = entry.select.id;
    entry.select.addEventListener("change", () => { if (entry.select.value === "pdf") entry.input.value = candidate.value == null ? "" : String(candidate.value); entry.input.disabled = entry.select.value === "keep"; });
    entry.input.addEventListener("input", () => { entry.select.value = "edit"; });
    card.append(label, entry.input, decisionLabel, entry.select, node("small", (candidate.source === "ocr" ? "OCR — ต้องตรวจค่า" : candidate.source === "acroform" ? "PDF Form Field" : "PDF Text Layer") + (candidate.page ? " · หน้า " + candidate.page : "")));
    if (candidate.validation_error) card.append(node("p", candidate.validation_error + " กรุณาแก้ก่อนเลือกใช้", "message error"));
    fields.push(entry); previewArea.append(card);
  }
  function targets(row) {
    const selected = row.targetInput.value;
    row.targetInput.replaceChildren(new Option("เลือก Record เดิม", ""));
    for (const existing of preview.snapshot[row.kind]) {
      const label = Object.entries(existing).filter(([key, value]) => pdfFieldSpecs[row.kind].some(spec => spec.key === key) && value != null).map(([, value]) => String(value)).join(" · ");
      row.targetInput.append(new Option(label || "รายการเดิม", existing.id));
    }
    if (selected) row.targetInput.value = selected;
    else { const match = preview.snapshot[row.kind].find(existing => importRecordIdentity(row.kind, existing) === importRecordIdentity(row.kind, row.values)); if (match) row.targetInput.value = match.id; }
  }
  function recordRow(kind, candidate, index) {
    const row = { kind, action: "skip", id: null, values: { ...candidate.values }, present: Object.keys(candidate.values), touched: new Set(), inputs: new Map(), originals: new Map() };
    const card = node("fieldset", undefined, "profile-pdf-record"); card.dataset.importRecord = kind + ":" + index; card.append(node("legend", titles[kind] + " — รายการจาก PDF " + (index + 1)));
    const current = node("p", "ข้อมูลเดิม: " + (preview.snapshot[kind].length ? "มี " + preview.snapshot[kind].length + " รายการ เลือกรายการด้านล่างเพื่อเทียบก่อนแก้" : "ยังไม่มีรายการ"), "profile-pdf-current"); card.append(current);
    row.actionInput = node("select"); row.actionInput.id = "pdfImportRecord-" + kind + "-" + index + "-action";
    row.actionInput.append(new Option("ข้ามรายการนี้", "skip"), new Option("เพิ่มรายการใหม่", "create"), new Option("แก้ไขรายการเดิม", "update"));
    const actionLabel = node("label", "เลือกการทำงาน"); actionLabel.htmlFor = row.actionInput.id;
    row.targetInput = node("select"); row.targetInput.id = "pdfImportRecord-" + kind + "-" + index + "-target"; targets(row); row.targetInput.disabled = true;
    const targetLabel = node("label", "รายการเดิมที่ต้องการแก้ไข"); targetLabel.htmlFor = row.targetInput.id;
    const grid = node("div", undefined, "profile-entry-grid");
    for (const spec of pdfFieldSpecs[kind]) {
      const group = node("div", undefined, "form-group"), label = node("label", spec.label); label.htmlFor = "pdfImportRecord-" + kind + "-" + index + "-" + spec.key;
      const input = inputFor(spec, label.htmlFor, row.values[spec.key]); input.disabled = true;
      input.addEventListener("input", () => row.touched.add(spec.key)); input.addEventListener("change", () => row.touched.add(spec.key));
      const original = node("p", "ค่าเดิม: ยังไม่ได้เลือกรายการเดิม", "profile-pdf-current"); row.originals.set(spec.key, original);
      const extracted = node("p", row.present.includes(spec.key) ? "ค่าที่อ่านได้จาก PDF: " + display(candidate.values[spec.key]) : "PDF ไม่มีค่าที่อ่านได้สำหรับช่องนี้ สามารถกรอกเองได้", "profile-pdf-extracted");
      row.inputs.set(spec.key, input); group.append(label, original, extracted, input); grid.append(group);
    }
    const compare = () => {
      const existing = preview.snapshot[kind].find(value => value.id === row.targetInput.value);
      for (const spec of pdfFieldSpecs[kind]) row.originals.get(spec.key).textContent = "ค่าเดิม: " + (row.actionInput.value === "update" && existing ? display(existing[spec.key]) : "ไม่ได้เลือกรายการเดิม");
      current.textContent = existing ? "รายการเดิม: " + pdfFieldSpecs[kind].map(spec => spec.label + ": " + display(existing[spec.key])).join(" · ") : "ยังไม่ได้เลือกรายการเดิม";
      if (row.actionInput.value === "update" && existing) for (const spec of pdfFieldSpecs[kind]) if (!row.present.includes(spec.key) && !row.touched.has(spec.key)) row.inputs.get(spec.key).value = existing[spec.key] ?? "";
    };
    row.compare = compare;
    row.actionInput.addEventListener("change", () => { row.targetInput.disabled = row.actionInput.value !== "update"; for (const input of row.inputs.values()) input.disabled = row.actionInput.value === "skip"; compare(); });
    row.targetInput.addEventListener("change", compare);
    card.append(actionLabel, row.actionInput, targetLabel, row.targetInput, grid, node("small", "ตรวจข้อมูลก่อนเพิ่ม ไม่มีการเลือกเพิ่มอัตโนมัติ · " + candidate.source));
    const errors = Object.values(candidate.validation_errors || {}); if (errors.length) card.append(node("p", errors.join(" · ") + " กรุณาแก้ก่อนนำเข้า", "message error"));
    records.push(row); previewArea.append(card);
  }
  function renderPreview(result) {
    preview = result; fields = []; records = []; previewArea.replaceChildren();
    previewArea.append(node("h3", "ตรวจข้อมูลก่อนนำเข้า"), node("p", result.original_name + " · " + result.page_count + " หน้า · " + (result.method === "ocr" ? "OCR ภายในเครื่อง" : "PDF Text Layer")),
      node("p", result.identity_status === "matched" ? "รหัสนักศึกษาใน PDF ตรงกับบัญชี — รหัสบัญชีจะไม่ถูกแก้ไข" : "ไม่พบรหัสนักศึกษาใน PDF โปรดตรวจว่าเป็นเอกสารของคุณ"));
    if (result.identity.thai_name) previewArea.append(node("p", "ชื่อใน PDF (อ่านอย่างเดียว): " + result.identity.thai_name + " · ชื่อบัญชี: " + [result.snapshot.student.first_name, result.snapshot.student.last_name].join(" ")));
    if (result.identity.english_name) previewArea.append(node("p", "ชื่อภาษาอังกฤษแบบรวม: " + result.identity.english_name + " — แยกชื่อ/นามสกุลในแบบฟอร์มด้วยตนเอง"));
    const warnings = node("ul", undefined, "profile-pdf-warnings"); for (const warning of result.warnings) warnings.append(node("li", warningLabels[warning] || "มีส่วนที่อ่านไม่ครบ โปรดตรวจต้นฉบับและกรอกเอง")); previewArea.append(warnings);
    result.candidates.forEach(scalarRow);
    for (const kind of Object.keys(titles)) result.records[kind].forEach((record, index) => recordRow(kind, record, index));
    if (!fields.length && !records.length) previewArea.append(node("p", "ไม่มีค่าที่อ่านได้อย่างปลอดภัย คุณยังเก็บต้นฉบับและกรอกเองได้ ข้อมูลเดิมจะไม่ถูกล้าง", "profile-empty-state"));
    status("Preview เท่านั้น ยังไม่มีการบันทึก เลือกใช้หรือแก้ค่าที่ต้องการแล้วกดยืนยัน", "info"); controls(); step(3);
  }
  function success(result, revision) {
    if (result.import_status !== "committed" || !result.profile_revision) throw new Error("ยังยืนยันการนำเข้าไม่ได้");
    // A recovered response reads today's snapshot, which may also contain another
    // client's later edit. Do not silently rebase manual drafts as an own write.
    onCommit(result, result.replayed ? undefined : revision); clear();
    step(5); notifyProfileChange(document, "saved");
    status("นำเข้าและเก็บต้นฉบับส่วนตัวเรียบร้อยแล้ว แก้ไขต่อได้ใน 4 แท็บ และดาวน์โหลดต้นฉบับในแท็บเอกสารประกอบ", "success");
    showToast("บันทึกข้อมูลที่เลือกและต้นฉบับ PDF เรียบร้อยแล้ว", "success"); history();
  }
  async function verify() {
    if (!preview || committing) return;
    try { const result = await getStudentProfilePdfImportStatus(preview.receipt); if (result.import_status === "committed") success(result, preview.snapshot.profile_revision); else { uncertain = false; status("ตรวจแล้วไม่พบการบันทึกของครั้งนี้ Draft ยังอยู่ ตรวจค่าก่อนยืนยันอีกครั้ง", "info"); controls(); } }
    catch (error) { if ([401,403].includes(error.status)) onUnauthorized(error); else status("ยังตรวจสถานะไม่ได้ โปรดลองตรวจอีกครั้งก่อนนำเข้าซ้ำ", "error"); }
  }
  extractButton.addEventListener("click", async () => {
    if (!file || processing || committing) return; const ticket = ++epoch; processing = true; controls(); step(2); setButtonLoading(extractButton, true, "กำลังอ่าน PDF..."); status("กำลังอ่าน PDF ภายในระบบ อาจใช้ OCR โปรดรอสักครู่ ยังไม่บันทึกข้อมูล", "loading");
    try { const result = await previewStudentProfilePdf(file); if (ticket !== epoch) return; renderPreview(result); }
    catch (error) { if (ticket !== epoch) return; step(1); if ([401,403].includes(error.status)) onUnauthorized(error); else { profileFieldError(fileInput, error.message || "อ่าน PDF ไม่สำเร็จ เลือกไฟล์ใหม่หรือลองอีกครั้ง", false); status(error.message || "อ่าน PDF ไม่สำเร็จ กรุณากรอกเอง", "error"); } }
    finally { if (ticket === epoch) { processing = false; setButtonLoading(extractButton, false); controls(); } }
  });
  fileInput.addEventListener("change", () => {
    clearProfileErrors(root);
    const selected = fileInput.files?.[0]; clear({ preserveFileInput: true });
    if (!selected) return;
    if (selected.type !== "application/pdf" || !/\.pdf$/i.test(selected.name) || selected.size < 1 || selected.size > 10 * 1024 * 1024) { profileFieldError(fileInput, "เลือกไฟล์นามสกุล .pdf ขนาดไม่เกิน 10MB"); status("เลือก PDF ที่ถูกต้องและไม่เกิน 10MB", "error"); return; }
    file = selected; status("เลือก " + file.name + " แล้ว กดอ่าน PDF เพื่อดู Preview ก่อนบันทึก"); controls();
  });
  saveButton.addEventListener("click", () => {
    if (!preview || committing || processing || uncertain || externalBusy()) return;
    capture(); clearProfileErrors(previewArea); let changes, invalidInput;
    try {
      for (const field of fields.filter(field => ["pdf", "edit"].includes(field.mode))) { invalidInput = field.input; normalizeImportField(pdfFieldSpecs[field.scope][field.key], field.value); }
      for (const row of records.filter(row => row.action !== "skip")) {
        if (row.action === "update" && !row.targetInput.value) { invalidInput = row.targetInput; throw new Error("กรุณาเลือกรายการเดิมที่ต้องการแก้ไข"); }
        for (const spec of pdfFieldSpecs[row.kind].filter(spec => row.present.includes(spec.key) || row.touched.has(spec.key))) { invalidInput = row.inputs.get(spec.key); normalizeImportField(spec, row.values[spec.key]); }
      }
      invalidInput = null; changes = buildProfilePdfChanges(preview.snapshot, fields, records);
    }
    catch (error) { if (invalidInput) profileFieldError(invalidInput, error.message); else { message.tabIndex = -1; message.focus(); } status(error.message, "error"); return; }
    const count = Object.values(changes.profile || {}).length + Object.values(changes.student || {}).length;
    const childCount = Object.keys(titles).reduce((total, kind) => total + (changes[kind]?.create?.length || 0) + (changes[kind]?.update?.length || 0), 0);
    step(4);
    showConfirmModal({ title: "ยืนยันนำเข้าค่าที่เลือกและเก็บต้นฉบับ?", message: "จะเปลี่ยน " + count + " ฟิลด์ และเพิ่ม/แก้ " + childCount + " รายการ พร้อมเก็บ PDF ส่วนตัว ฟิลด์ที่ข้ามและข้อมูลที่ PDF ไม่มีจะคงเดิม" + (preview.identity_status === "not_present" ? " — เอกสารไม่มีรหัสนักศึกษา โปรดยืนยันว่าเป็นเอกสารของคุณ" : "") + " Draft ในแบบฟอร์มกรอกเองจะยังอยู่ กรุณาตรวจอีกครั้งหลังนำเข้า", confirmLabel: "ยืนยันบันทึก", onClose: () => { if (preview) step(3); }, onConfirm: async () => {
      if (committing || externalBusy()) throw new Error("กำลังบันทึกข้อมูลส่วนอื่น กรุณารอก่อน");
      committing = true; controls(); step(5); notifyProfileChange(document); setButtonLoading(saveButton, true, "กำลังบันทึก..."); status("กำลังบันทึกค่าที่เลือกและต้นฉบับ PDF", "loading");
      const frozen = preview, original = file;
      try { success(await commitStudentProfilePdf(original, frozen.receipt, changes, frozen.snapshot.profile_revision), frozen.snapshot.profile_revision); }
      catch (error) {
        if ([401,403].includes(error.status)) { onUnauthorized(error); throw new Error("สิทธิ์ใช้งานหมดอายุ"); }
        if (error.status === 409 || error.status === 428) { status(error.status === 409 ? "ข้อมูลเปลี่ยนหรือมีรายการซ้ำ Draft Import ยังอยู่ กดตรวจข้อมูลล่าสุดแล้วเปรียบเทียบก่อนยืนยันใหม่" : "ต้องโหลด Revision ล่าสุด Draft Import ยังอยู่ กดตรวจข้อมูลล่าสุดก่อนยืนยัน", "error"); throw new Error(message.textContent); }
        if (!error.status || error.status >= 500) {
          uncertain = true;
          try { const result = await getStudentProfilePdfImportStatus(frozen.receipt); if (result.import_status === "committed") { success(result, frozen.snapshot.profile_revision); return; } uncertain = false; } catch { /* Never resubmit a write with an unknown commit outcome. */ }
          status(uncertain ? "ยังยืนยันผลไม่ได้ กดตรวจสถานะก่อนนำเข้าซ้ำ Draft ยังอยู่" : "ตรวจแล้วไม่พบการบันทึกของครั้งนี้ Draft ยังอยู่ โปรดตรวจค่าก่อนยืนยันใหม่", "error");
        } else status(error.message || "นำเข้าไม่สำเร็จ Draft ยังอยู่", "error");
        throw new Error(message.textContent);
      } finally { committing = false; setButtonLoading(saveButton, false); controls(); notifyProfileChange(document); }
    } });
  });
  reviewButton.addEventListener("click", () => {
    if (!preview || committing || externalBusy()) return;
    showConfirmModal({ title: "ตรวจข้อมูลล่าสุดและเก็บ Draft Import?", message: "ค่าที่เลือกหรือแก้ไว้ยังอยู่ ค่าเดิมจะโหลดใหม่เพื่อให้เปรียบเทียบ ไม่มีการบันทึกอัตโนมัติ ต้องตรวจรายการซ้ำและยืนยันอีกครั้ง", confirmLabel: "โหลดและเก็บค่าที่แก้", onConfirm: async () => {
      capture(); const result = await reviewStudentProfilePdfImport(preview.receipt);
      if (result.import_status === "committed") { success(result, preview.snapshot.profile_revision); return; }
      preview.snapshot = result.snapshot; preview.receipt = result.receipt; uncertain = false;
      for (const field of fields) field.old.textContent = "ค่าเดิมล่าสุด: " + display(preview.snapshot[field.scope]?.[field.key]);
      for (const row of records) { targets(row); row.compare(); }
      status("โหลดล่าสุดแล้ว Draft Import ยังอยู่ โปรดเปรียบเทียบและตรวจรายการก่อนกดยืนยันใหม่", "info"); controls();
    } });
  });
  verifyButton.addEventListener("click", verify);
  const cancel = () => { if (committing) return; showConfirmModal({ title: "ยกเลิกการนำเข้า PDF?", message: "ไฟล์และ Preview ที่ยังไม่ยืนยันจะถูกทิ้ง ไม่มีการเปลี่ยน Profile หรือเอกสารเดิม Draft ที่กรอกเองยังอยู่", confirmLabel: "ยกเลิกนำเข้า", onConfirm: () => { clear(); status("ยกเลิกแล้ว ข้อมูลเดิมไม่เปลี่ยน"); } }); };
  cancelButton.addEventListener("click", cancel);
  importButton.addEventListener("click", () => { if (!committing) method(true); });
  manualButton.addEventListener("click", () => { if (committing) return; if (file || preview || processing) { showConfirmModal({ title: "กลับไปกรอกเอง?", message: "จะทิ้งไฟล์และ Preview ที่ยังไม่ยืนยัน Draft แบบกรอกเองยังอยู่", confirmLabel: "กรอกเอง", onConfirm: () => { clear(); method(false); } }); } else method(false); });
  const controller = { get busy() { return committing; }, hasChanges() { return !!file || !!preview; }, acceptSnapshot(result) {
    if (!result?.profile_revision) return;
    if (!initialized) { initialized = true; history(); }
    if (preview && result.profile_revision !== preview.snapshot.profile_revision) status("Profile เปลี่ยนหลังสร้าง Preview ค่าที่เลือกยังอยู่ ต้องตรวจข้อมูลล่าสุดก่อนยืนยัน", "info");
  } };
  if (getSnapshot()?.profile_revision) controller.acceptSnapshot(getSnapshot()); controls(); mounted.set(root, controller); return controller;
}
