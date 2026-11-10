function node(tag, text, className = "") {
  const result = document.createElement(tag);
  if (text != null) result.textContent = text;
  result.className = className;
  return result;
}

function listSection(parent, title, values, empty = "ไม่มีข้อมูล") {
  parent.append(node("p", title, "job-explanation-label"));
  if (!values?.length) { parent.append(node("p", empty)); return; }
  const list = node("ul");
  values.forEach((value) => list.append(node("li", value)));
  parent.append(list);
}

function inputText(parent, label, text) {
  const details = node("details", null, "job-explanation-input");
  details.append(node("summary", label), node("p", text || "ไม่ได้ใช้ข้อมูลประเภทนี้ในรอบนี้", "job-explanation-text"));
  parent.append(details);
}

const levelText = (skill) => `${skill.skill_name}${skill.proficiency_label || skill.proficiency ? ` (${skill.proficiency_label || skill.proficiency})` : ""}`;

export function renderMatchingAnalysis(target, analysis) {
  if (!target) return;
  target.replaceChildren();
  target.hidden = !analysis;
  if (!analysis) return;
  const details = node("details", null, "job-explanation");
  details.append(node("summary", "ข้อมูลที่ใช้วิเคราะห์รอบล่าสุด"));
  details.append(node("p", `${analysis.algorithm} — ${analysis.computed ? "ส่งข้อมูลคำนวณแล้ว" : "ไม่มีประกาศที่เข้าเกณฑ์ให้คำนวณในรอบนี้"}`));
  details.append(node("p", "คะแนน 0–1 แสดงเป็น 0–100% ของความคล้ายข้อความ ไม่ใช่โอกาสได้งานหรือผลตรวจคุณสมบัติ"));
  const program = analysis.program;
  details.append(node("p", `สาขาที่บันทึก: ${program?.value || "ยังไม่ได้ระบุ"} — ${program?.used_as_text ? "ส่งเป็นข้อความประกอบการวิเคราะห์ ไม่ใช่ตัวกรองสิทธิ์ IT/INE" : "ไม่ได้ส่งสาขาประกอบการวิเคราะห์รอบนี้"}`));
  const inputIds = new Set((analysis.input_computer_skills || []).map((skill) => skill.id));
  listSection(details, "Computer Skills ที่บันทึกใน Profile", (analysis.saved_computer_skills || []).map(levelText), "ยังไม่ได้ระบุ");
  listSection(details, "ชื่อ Computer Skills ที่อยู่ในข้อความส่งให้ Algorithm ก่อนตัดคำ", (analysis.input_computer_skills || []).map((skill) => skill.skill_name), "ไม่มีชื่อ Computer Skills จาก Profile ในข้อความที่ส่งรอบนี้");
  const excluded = (analysis.saved_computer_skills || []).filter((skill) => !inputIds.has(skill.id));
  if (excluded.length) listSection(details, analysis.computed
    ? "ทักษะที่บันทึกไว้ แต่ไม่พบชื่อเต็มในข้อความ Profile ที่ส่งรอบนี้"
    : "ทักษะที่บันทึกไว้ แต่รอบนี้ยังไม่ได้ส่งคำนวณ", excluded.map((skill) => skill.skill_name));
  details.append(node("p", "ระดับความสามารถแสดงเพื่อให้ข้อมูลเท่านั้น ไม่ใช้คำนวณน้ำหนักคะแนน; การส่งชื่อเข้า Algorithm ไม่ยืนยันว่าแต่ละชื่อมีส่วนต่อคะแนนเท่าใดหลังตัดคำ"));
  details.append(node("p", `Related Skills ที่บันทึก (ข้อความอิสระ): ${analysis.related_skills?.saved_text || "ยังไม่ได้ระบุ"}`));
  if (analysis.related_skills?.saved_text && !analysis.related_skills.full_text_in_input) {
    details.append(node("p", analysis.computed
      ? "ข้อความ Related Skills ไม่ปรากฏครบในข้อความ Profile ที่ส่ง อาจไม่ได้ใช้ Profile หรือติดขีดจำกัดความยาว; ตรวจข้อความจริงด้านล่าง"
      : "รอบนี้ยังไม่ได้ส่ง Related Skills คำนวณ เพราะไม่มีประกาศที่เข้าเกณฑ์ให้ส่ง NLP"));
  }
  listSection(details, analysis.computed ? "แหล่งข้อมูลรอบนี้" : "แหล่งข้อมูลที่ตรวจอ่านเพื่อเตรียมวิเคราะห์ (ยังไม่ได้คำนวณ)", analysis.sources);
  const weights = Object.entries(analysis.weights || {}).map(([key, value]) => `${key === "profile" ? "Profile" : "Resume"} ${Math.round(value * 100)}%`).join(" + ");
  details.append(node("p", `สูตรคะแนนเดิม${analysis.computed ? "" : " (รอบนี้ยังไม่ได้ใช้คำนวณ)"}: ${weights}; แสดงสูงสุด ${analysis.top_k} งานที่คะแนนตั้งแต่ ${analysis.min_score}; อันดับตามคะแนนที่ปัด 4 ตำแหน่งจากมากไปน้อย กรณีเท่ากันเรียงด้วยรหัสงาน`));
  if (analysis.computed) {
    inputText(details, "ข้อความ Profile ที่ส่งคำนวณจริง (ก่อนตัดคำ)", analysis.input_text?.profile);
    inputText(details, "ข้อความ Resume ที่ส่งคำนวณจริง (ก่อนตัดคำ)", analysis.input_text?.resume);
  } else {
    inputText(details, "ข้อความ Profile ที่เตรียมไว้ — ไม่ได้ส่งคำนวณ", analysis.prepared_input_text?.profile);
    inputText(details, "ข้อความ Resume ที่เตรียมไว้ — ไม่ได้ส่งคำนวณ", analysis.prepared_input_text?.resume);
  }
  listSection(details, "ข้อจำกัด", analysis.limitations);
  target.append(details);
}

export function createJobExplanation(match) {
  const wrapper = node("div", null, "job-explanation-wrapper");
  const explanation = match.explanation;
  if (!explanation) {
    wrapper.append(node("p", "Backend ยังไม่ได้ส่งคำอธิบาย จึงไม่สามารถยืนยันเหตุผลรายทักษะได้"));
    return wrapper;
  }
  const preview = match.development_data === true;
  wrapper.append(node("p", explanation.reason));
  listSection(wrapper, "พบชื่อ Computer Skills แบบตรงในข้อความประกาศ", (explanation.exact_skill_matches || []).map((skill) => skill.skill_name), "ไม่พบชื่อทักษะแบบตรง ไม่ได้หมายความว่าไม่ผ่านคุณสมบัติ");
  const details = node("details", null, "job-explanation");
  details.append(node("summary", preview ? "รายละเอียดการเปรียบเทียบตัวอย่างนี้" : "ทำไมระบบแนะนำงานนี้?"));
  const fields = { title: "ชื่อตำแหน่ง", category: "หมวดหมู่", description: "รายละเอียดประกาศ" };
  listSection(details, "หลักฐานข้อความแบบตรง (ไม่ใช่ Required Skills ที่รับรองแล้ว)", (explanation.exact_skill_matches || []).map((skill) =>
    `${levelText(skill)} — พบใน ${(skill.evidence_fields || []).map((field) => fields[field] || field).join(", ")}${!preview && !skill.included_in_input ? "; ไม่พบชื่อเต็มในข้อความ Profile ที่ส่งรอบนี้" : ""}`), "ไม่มีหลักฐานชื่อทักษะแบบตรง");
  listSection(details, "ทักษะอื่นของนักศึกษา — ไม่พบชื่อเต็มในประกาศ", (explanation.other_computer_skills || []).map(levelText), "ไม่มีรายการอื่น");
  const related = explanation.related_text_evidence;
  if (related?.saved_text) details.append(node("p", `ข้อความ Related Skills: ${related.saved_text} — ${related.full_literal_found ? "พบข้อความตรงทั้งข้อความในประกาศ" : "ไม่พบตรงทั้งข้อความ; ไม่ได้ตีความหรือแยกเป็นทักษะใหม่"}`));
  details.append(node("p", `สาขาที่บันทึก: ${explanation.program?.value || "ยังไม่ได้ระบุ"} — ${explanation.program?.used_as_text ? "ใช้เป็นข้อความประกอบการวิเคราะห์" : "ไม่ได้ใช้เป็น Input ของการคำนวณนี้"}`));
  listSection(details, "แหล่งข้อมูลที่จับคู่", explanation.sources);
  details.append(node("p", "การพบชื่อแบบตรงเป็นการตรวจข้อความแยกต่างหาก ส่วนคะแนนจริงมาจาก TF-IDF + cosine similarity; ไม่ใช่ Semantic Similarity และ Backend ไม่มีส่วนแบ่งคะแนนรายคำ/รายทักษะให้ยืนยัน"));
  if (!preview) inputText(details, "ข้อความประกาศที่ส่งคำนวณจริง", explanation.job_input_text);
  listSection(details, "ข้อจำกัดของคำอธิบาย", explanation.limitations);
  wrapper.append(details);
  return wrapper;
}
