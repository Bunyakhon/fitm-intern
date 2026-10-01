const OCR_TIMEOUT_MS = Number(process.env.NLP_OCR_TIMEOUT_MS) > 0
  ? Number(process.env.NLP_OCR_TIMEOUT_MS)
  : 20_000;

async function extractResumeWithOcr(pdfBytes) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "resume.pdf");
    const baseUrl = (process.env.NLP_SERVICE_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/api/v1/resume-ocr`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) return "";
    const data = await response.json();
    return typeof data?.text === "string" ? data.text : "";
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { extractResumeWithOcr };
