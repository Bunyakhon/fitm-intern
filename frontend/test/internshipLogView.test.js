import test from "node:test";
import assert from "node:assert/strict";
import { displayDate, renderEntries, renderHistory } from "../src/pages/internshipLogView.js";
class Element { constructor(tag) { this.tag = tag; this.children = []; this.textContent = ""; } append(...elements) { this.children.push(...elements); } replaceChildren() { this.children = []; } }
test("daily snapshot view renders user text safely and all required fields", () => {
  const previous = globalThis.document; globalThis.document = { createElement: tag => new Element(tag) };
  try { const container = new Element("div"); renderEntries(container, [{ log_date: "2026-10-08", kind: "working", assigned_work: "<script>bad()</script>", work_result: "เสร็จ", problems: "ไม่มีปัญหา", solutions: "ไม่ต้องแก้ไข" }]); assert.equal(container.children.length, 1); assert.match(container.children[0].children[1].textContent, /<script>/); assert.equal(container.children[0].children.length, 6); } finally { globalThis.document = previous; }
});
test("nonworking snapshot shows reason without fictional work fields", () => {
  const previous = globalThis.document; globalThis.document = { createElement: tag => new Element(tag) };
  try { const container = new Element("div"); renderEntries(container, [{ log_date: "2026-10-08", kind: "non_working", non_working_reason: "ลา" }]); assert.equal(container.children[0].children.length, 3); assert.match(container.children[0].children[1].textContent, /ลา/); } finally { globalThis.document = previous; }
});
test("weekly history shows stored Mentor feedback/name/date and expandable original snapshot", () => {
  const previous = globalThis.document; globalThis.document = { createElement: tag => new Element(tag) };
  try { const container = new Element("div"); renderHistory(container, [{ version: 1, action: "submitted", createdAt: "2026-10-08T17:00:00Z", snapshot: { logs: [] } }, { version: 2, action: "revision_requested", createdAt: "2026-10-09T01:00:00Z", mentor_name: "ผู้ดูแลจริง", feedback: "เพิ่มรายละเอียด" }]); assert.equal(container.children[1].tag, "details"); assert.match(container.children[2].textContent, /ผู้ดูแลจริง/); assert.match(container.children[2].textContent, /เพิ่มรายละเอียด/); assert.match(displayDate("2026-10-08"), /8/); } finally { globalThis.document = previous; }
});
