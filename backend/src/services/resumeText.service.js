const { PDFParse } = require("pdf-parse");

function normalizeExtractedText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableResumeText(value) {
  const text = normalizeExtractedText(value);
  const meaningful = (text.match(/[A-Za-z0-9\u0E00-\u0E7F]/g) || []).length;
  return text.length >= 80 && meaningful >= 60;
}

async function extractResumeText(source) {
  let parser;
  try {
    parser = Buffer.isBuffer(source)
      ? new PDFParse({ data: source })
      : new PDFParse({ url: source });
    const result = await parser.getText();
    return normalizeExtractedText(result?.text);
  } catch {
    return "";
  } finally {
    try {
      if (parser) await parser.destroy();
    } catch {
      // Parser cleanup must not turn an extraction fallback into a request error.
    }
  }
}

module.exports = { extractResumeText, normalizeExtractedText, isUsableResumeText };
