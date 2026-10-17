// Safe bytes generated in memory; no filesystem/storage/DB writes or external resources.
// Text/AcroForm TGDE fixture candidate; existing NLP/runtime acceptance is separate.
function fixturePdf(studentId = "9900000000004") {
  if (!/^990000000000[1-5]$/.test(studentId)) throw new Error("FIXTURE_ID_REQUIRED");
  const objects = [], put = value => { objects.push(value); return objects.length; };
  put(""); put("");
  const font = put("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [], fieldIds = [];
  const headings = ["Student personal information", "Education Background", "Special Abilities", "Cooperative Application - NO WORKFLOW / NO SIGNATURE"];
  for (let index = 0; index < 4; index++) {
    const pageId = put(""); pageIds.push(pageId);
    const lines = ["TGDE-COOP-02 - SYNTHETIC TEST FIXTURE", headings[index], "NOT AN OFFICIAL FORM - NO REAL PERSONAL DATA", `Page ${index + 1} of 4`];
    if (index === 0) lines.push(`Student ID: ${studentId}`, "Registered Address: SYNTHETIC ADDRESS ONLY");
    const stream = `BT /F1 12 Tf 40 790 Td ${lines.map((line, i) => `${i ? "0 -24 Td " : ""}(${line}) Tj`).join("\n")} ET`;
    const content = put(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const annotations = [];
    if (index === 0) for (const [name, value] of [["identity.student_id", studentId], ["profile.english_first_name", `DEMO${studentId.at(-1)}`], ["profile.english_last_name", "STUDENT"], ["profile.nationality", "SYNTHETIC"], ["student.major", Number(studentId.at(-1)) % 2 ? "IT" : "INE"]]) {
      const y = 570 - annotations.length * 30;
      const widget = put(`<< /Type /Annot /Subtype /Widget /FT /Tx /T (${name}) /V (${value}) /Rect [40 ${y} 300 ${y + 20}] /P ${pageId} 0 R /F 4 /DA (/F1 10 Tf 0 g) >>`);
      annotations.push(widget); fieldIds.push(widget);
    }
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.2 841.8] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R /Annots [${annotations.map(id => `${id} 0 R`).join(" ")}] >>`;
  }
  const acroForm = put(`<< /Fields [${fieldIds.map(id => `${id} 0 R`).join(" ")}] /DR << /Font << /F1 ${font} 0 R >> >> /DA (/F1 10 Tf 0 g) /NeedAppearances true >>`);
  objects[0] = `<< /Type /Catalog /Pages 2 0 R /AcroForm ${acroForm} 0 R >>`;
  objects[1] = `<< /Type /Pages /Count 4 /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] >>`;
  let result = "%PDF-1.4\n", offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(result)); result += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(result);
  result += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(result);
}
function fixtureAssets(studentId = "9900000000004") {
  const pdf = fixturePdf(studentId);
  return [
    { name: "avatar.png", mime: "image/png", purpose: "synthetic 1px image; no real photo", bytes: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNImG4PAAKRATfFqcjRAAAAAElFTkSuQmCC", "base64") },
    ...["transcript.pdf", "student_id_copy.pdf", "supporting_other.pdf", "profile-import.pdf"].map(name => ({ name, mime: "application/pdf", purpose: "synthetic upload bytes; identity must match fixture owner", bytes: Buffer.from(pdf) })),
  ];
}
module.exports = { fixturePdf, fixtureAssets };
