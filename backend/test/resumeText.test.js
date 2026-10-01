const assert = require("node:assert/strict");
const test = require("node:test");
const { isUsableResumeText, normalizeExtractedText } = require("../src/services/resumeText.service");

test("normalizes extracted text while retaining Thai and English", () => {
  const normalized = normalizeExtractedText("  Software\u0000 Engineer\nทักษะ  Python  ");
  assert.equal(normalized, "Software Engineer ทักษะ Python");
});

test("rejects weak PDF text and accepts meaningful Thai/English resume text", () => {
  assert.equal(isUsableResumeText("Short line"), false);
  assert.equal(isUsableResumeText("!!!!!!".repeat(30)), false);
  assert.equal(isUsableResumeText("Experienced software engineer with Python, SQL, Linux and network support. ทักษะการทำงานและประสบการณ์ด้านเทคโนโลยีสารสนเทศ"), true);
});
