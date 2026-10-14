const MAX_RESPONSE = 512 * 1024;
const { getNlpMatchingConfig } = require("../config/nlp");
function localProcessorUrl() {
  const url = new URL(process.env.PROFILE_PDF_NLP_URL || getNlpMatchingConfig().baseUrl);
  const host = url.hostname;
  const trusted = ["localhost", "[::1]", "nlp-service", "intern_nlp_service"].includes(host)
    || /^127\.\d+\.\d+\.\d+$/.test(host) || /^10\.\d+\.\d+\.\d+$/.test(host)
    || /^192\.168\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);
  if (url.protocol !== "http:" || !trusted || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw Object.assign(new Error("PDF processor ต้องเป็นบริการภายในที่อนุญาต"), { status: 503, code: "PDF_PROCESSOR_CONFIGURATION" });
  }
  return new URL("/api/v1/profile-pdf", url);
}
async function extractProfilePdf(buffer) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50_000);
  try {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "application/pdf" }), "profile.pdf");
    const response = await fetch(localProcessorUrl(), { method: "POST", body: form, signal: controller.signal, redirect: "error" });
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > MAX_RESPONSE) { await reader.cancel(); throw new Error("Processor response limit"); }
      chunks.push(value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!response.ok) {
      const code = typeof data.detail === "string" && /^[A-Z_]{1,80}$/.test(data.detail) ? data.detail : "PDF_PROCESSING_FAILED";
      const messages = { UNSUPPORTED_TEMPLATE: "PDF ไม่ใช่แบบ TGDE-COOP–02 ที่รองรับ กรุณากรอกเอง", ENCRYPTED_PDF: "ไม่รองรับ PDF ที่เข้ารหัสหรือมีรหัสผ่าน", CORRUPTED_PDF: "PDF เสียหายหรืออ่านไม่ได้", PDF_RESOURCE_LIMIT: "รองรับ PDF ไม่เกิน 4 หน้าและขนาดที่กำหนด", OCR_LANGUAGES_UNAVAILABLE: "OCR ภาษาไทยและอังกฤษยังไม่พร้อม กรุณาใช้ PDF ที่มีข้อความ", ACTIVE_PDF_NOT_SUPPORTED: "ไม่รองรับ PDF ที่มีคำสั่งหรือไฟล์แนบภายใน", PDF_PROCESSING_TIMEOUT: "ประมวลผล PDF เกินเวลาที่กำหนด", OCR_TIMEOUT: "OCR เกินเวลาที่กำหนด" };
      throw Object.assign(new Error(messages[code] || "ไม่สามารถอ่าน PDF ได้ กรุณาตรวจไฟล์หรือกรอกเอง"), { status: response.status === 503 ? 503 : 422, code });
    }
    return data;
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error("บริการอ่าน PDF ยังไม่พร้อมหรือประมวลผลเกินเวลา กรุณากรอกเองหรือลองใหม่ภายหลัง"), { status: 503, code: "PDF_PROCESSOR_UNAVAILABLE" });
  } finally { clearTimeout(timer); }
}
module.exports = { extractProfilePdf, localProcessorUrl };
