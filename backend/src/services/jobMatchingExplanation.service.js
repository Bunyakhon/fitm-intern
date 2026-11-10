// Read-only explanation of existing inputs/results. Never used to rank, filter
// or score jobs, and never presented as TF-IDF feature attribution.
const normalize = (value) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().toLowerCase() : "";

function containsLiteralName(text, name) {
  const literal = normalize(name);
  if (!literal) return false;
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Prevent Java matching JavaScript, SQL matching MySQL, or C matching C++.
  const boundary = "[^\\p{L}\\p{N}\\p{M}_+#]";
  return new RegExp(`(^|${boundary})${escaped}(?=$|${boundary})`, "u").test(normalize(text));
}

const LIMITATIONS = [
  "คะแนนเป็นความคล้ายของข้อความ ไม่ใช่โอกาสได้งานหรือผลตรวจคุณสมบัติ",
  "TF-IDF เปรียบเทียบคำหลังตัดคำและกรอง stopwords ไม่ใช่ Semantic Similarity/LLM; ไม่ยืนยันความเข้าใจความหมายหรือคำปฏิเสธ",
  "การพบชื่อทักษะแบบตรงเป็นการตรวจข้อความแยกจากคะแนน ไม่ใช่ส่วนแบ่งคะแนนรายทักษะ",
  "ไม่พบชื่อทักษะไม่ได้แปลว่าไม่ผ่านคุณสมบัติ; อาจใช้คำอื่นหรือมีข้อมูลไม่ครบ และข้อความประกาศไม่ใช่ Required Skills ที่ยืนยันแล้ว",
  "Related Skills เป็นข้อความอิสระ จึงไม่แปลงเป็นรายการคุณสมบัติของบริษัทหรือเดาชื่อทักษะเพิ่ม",
  "ระดับความสามารถแสดงเพื่อให้ข้อมูลเท่านั้น ไม่ได้ใช้ให้น้ำหนักคะแนน",
  "คะแนนขึ้นกับชุดประกาศที่ใช้สร้าง TF-IDF ในรอบนั้น; การเพิ่มหรือลบงานอาจทำให้คะแนนเปลี่ยน",
];

function describeAnalysis({ savedSource, candidate, usesProfile, mode, topK, minScore, jobCount }) {
  const computed = jobCount > 0;
  const profileText = usesProfile ? candidate.text : "";
  const resumeText = candidate.resume_text ?? (usesProfile ? "" : candidate.text);
  const usedComputerSkills = savedSource.computer_skills.filter((skill) => containsLiteralName(profileText, skill.skill_name));
  return {
    mode, computed,
    algorithm: "TF-IDF + cosine similarity",
    similarity_type: "lexical_text_similarity_not_semantic_model",
    score_range: [0, 1], display_multiplier: 100,
    weights: candidate.resume_text ? { profile: 0.65, resume: 0.35 } : { [usesProfile ? "profile" : "resume"]: 1 },
    top_k: topK, min_score: minScore, score_decimals: 4,
    ranking: "score descending, then job UUID ascending for tied rounded scores",
    candidate_job_count: jobCount,
    profile_used: computed && usesProfile, resume_used: computed && Boolean(resumeText),
    program: { value: savedSource.major, used_as_text: false,
      eligibility_filter: false },
    saved_computer_skills: savedSource.computer_skills,
    input_computer_skills: computed ? usedComputerSkills : [],
    // These are exact strings sent to the engine before its own preprocessing.
    input_text: { profile: computed ? profileText : "", resume: computed ? resumeText : "" },
    ...(!computed ? { prepared_input_text: { profile: profileText, resume: resumeText } } : {}),
    related_skills: { saved_text: savedSource.related_skills,
      full_text_in_input: computed && usesProfile && containsLiteralName(profileText, savedSource.related_skills),
      may_be_truncated: usesProfile && Boolean(savedSource.related_skills) && profileText.length === 20000 },
    proficiency_used_for_score: false,
    sources: [
      ...(usesProfile ? ["Computer Skills ที่บันทึกใน student_skills (computer)", "Related Skills ที่บันทึกใน student_profiles.related_skills"] : []),
      ...(resumeText ? ["ข้อความ Resume ที่ Backend อ่านได้และอยู่สถานะ ready"] : []),
      "ชื่อตำแหน่ง หมวดหมู่ และรายละเอียดของประกาศ published ที่ยังไม่หมดอายุ",
    ],
    limitations: LIMITATIONS,
  };
}

function explainJob(job, analysis, { preview = false, jobText } = {}) {
  const evidenceFields = ["title", "category", "description"];
  const skills = analysis.saved_computer_skills.map((skill) => ({
    ...skill,
    included_in_input: !preview && analysis.input_computer_skills.some((input) => input.id === skill.id),
    evidence_fields: evidenceFields.filter((field) => containsLiteralName(job[field], skill.skill_name)),
  }));
  const exactMatches = skills.filter((skill) => skill.evidence_fields.length > 0);
  return {
    kind: preview ? "development_preview_not_recommendation" : "lexical_evidence_not_score_attribution",
    reason: preview
      ? "รายการข้อมูลจำลองสำหรับ Development ไม่ได้ส่งเข้า Algorithm และไม่มีคะแนนหรืออันดับ Matching"
      : !analysis.profile_used
        ? "คะแนนรอบนี้คำนวณจากข้อความ Resume เท่านั้น; รายการชื่อทักษะจาก Profile เป็นหลักฐานข้อความเพิ่มเติม ไม่ได้ใช้เพิ่มคะแนน"
        : exactMatches.length
        ? "Algorithm คืนตำแหน่งนี้จากคะแนนความคล้ายของข้อความ และตรวจพบชื่อทักษะที่บันทึกในข้อความประกาศ การตรวจชื่อทักษะไม่ได้อธิบายส่วนแบ่งคะแนน"
        : "Algorithm คืนตำแหน่งนี้จากคะแนนความคล้ายของข้อความ แต่ไม่พบชื่อ Computer Skills แบบตรง จึงไม่สามารถยืนยันว่าทักษะใดทำให้ได้คะแนน",
    exact_skill_matches: exactMatches,
    other_computer_skills: skills.filter((skill) => skill.evidence_fields.length === 0),
    literal_match_method: "case-insensitive literal name, normalized whitespace and word boundaries; no aliases or semantic inference",
    related_text_evidence: { saved_text: analysis.related_skills.saved_text,
      full_literal_found: evidenceFields.some((field) => containsLiteralName(job[field], analysis.related_skills.saved_text)) },
    program: { ...analysis.program, used_as_text: !preview && analysis.program.used_as_text },
    sources: preview ? ["ข้อมูลประกาศและ Skills/Work summary จาก Dataset Development; ไม่ได้ใช้คำนวณคะแนน"] : analysis.sources,
    job_input_text: preview ? null : jobText,
    skill_score_contributions: null,
    limitations: [...(preview ? ["การพบชื่อทักษะในตัวอย่างไม่ใช่ผลแนะนำหรือการรับรองการเปิดรับ"] : []), ...LIMITATIONS],
  };
}

module.exports = { describeAnalysis, explainJob };
