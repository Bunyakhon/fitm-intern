const { Op, fn, col, where } = require("sequelize");

// Search aliases only: never stored categories, required skills or NLP features.
const SPECIALIZATIONS = {
  software_development: ["software development", "software developer", "software engineer", "programmer", "programming", "พัฒนาโปรแกรม", "เขียนโปรแกรม"],
  frontend: ["frontend", "front end", "front-end", "หน้าบ้าน"],
  backend: ["backend", "back end", "back-end", "หลังบ้าน"],
  full_stack: ["full stack", "full-stack", "fullstack"],
  it_support: ["it support", "it-support", "helpdesk", "help desk", "service desk", "ไอที ซัพพอร์ต", "ไอทีซัพพอร์ต", "สนับสนุนผู้ใช้"],
  network: ["network", "networking", "ระบบเครือข่าย"],
  system_administration: ["system admin", "system administrator", "system administration", "infrastructure", "system engineer", "ดูแลระบบ"],
  cloud_devops: ["cloud", "devops", "dev ops", "ci/cd", "deployment automation"],
  cybersecurity: ["cybersecurity", "cyber security", "network security", "information security", "soc analyst", "siem", "edr", "firewall", "ความปลอดภัยเครือข่าย"],
  database_data_engineering: ["database", "data engineer", "data engineering", "sql", "nosql", "ฐานข้อมูล"],
  data_analysis: ["data analyst", "data analysis", "data science", "data scientist", "power bi", "business intelligence", "วิเคราะห์ข้อมูล"],
  ai_ml: ["artificial intelligence", "machine learning", "ai", "ml", "ปัญญาประดิษฐ์"],
  software_testing: ["software testing", "software tester", "quality assurance", "qa", "ทดสอบซอฟต์แวร์"],
  mobile: ["mobile", "android", "ios", "flutter", "react native", "แอปพลิเคชันมือถือ"],
  ui_ux: ["ui/ux", "ui", "ux", "digital design", "graphic", "motion", "ออกแบบดิจิทัล"],
  other: [], // This option means the stored broad category, not inferred leftovers.
};
const CATEGORIES = ["information_technology", "business", "design", "engineering", "other"];
const normalizeProvince = value => {
  const name = String(value ?? "").trim().replace(/^(?:จังหวัด\s*|จ\.\s*)/u, "").trim();
  return ["กรุงเทพ", "กรุงเทพฯ", "กทม", "กทม."].includes(name) ? "กรุงเทพมหานคร" : name === "ทุกจังหวัด" ? "" : name;
};
const literal = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function specializationPattern(value) {
  return `(^|[^[:alnum:]_])(${SPECIALIZATIONS[value].map(literal).join("|")})([^[:alnum:]_]|$)`;
}
function jobSearchConditions(query = {}) {
  const invalid = () => { throw Object.assign(new Error("ตัวกรองค้นหาประกาศไม่ถูกต้อง"), { status: 400, code: "JOB_FILTER_INVALID" }); };
  for (const [key, max] of [["q", 255], ["category", 64], ["specialization", 64], ["province", 100]]) {
    if (query[key] !== undefined && (typeof query[key] !== "string" || query[key].length > max || /[\u0000-\u001f]/u.test(query[key]))) invalid();
  }
  const q = (query.q || "").trim(), category = query.category || "", specialization = query.specialization || "", province = normalizeProvince(query.province);
  if ((category && !CATEGORIES.includes(category)) || (specialization && !Object.hasOwn(SPECIALIZATIONS, specialization))) invalid();
  const conditions = [], pattern = value => `%${value.replace(/[\\%_]/g, "\\$&")}%`;
  if (q) conditions.push({ [Op.or]: [{ title: { [Op.iLike]: pattern(q) } }, { description: { [Op.iLike]: pattern(q) } }, { "$company.name$": { [Op.iLike]: pattern(q) } }] });
  if (category) conditions.push({ category });
  if (specialization === "other") conditions.push({ category: "other" });
  else if (specialization) conditions.push({ [Op.or]: ["title", "description"].map(field => ({ [field]: { [Op.iRegexp]: specializationPattern(specialization) } })) });
  if (province) {
    const names = province === "กรุงเทพมหานคร" ? [province, "กรุงเทพ", "กรุงเทพฯ", "กทม", "กทม."] : [province];
    conditions.push(where(fn("regexp_replace", fn("btrim", col("company.province")), "^(จังหวัด[[:space:]]*|จ\\.[[:space:]]*)", "", "i"), { [Op.in]: names }));
  }
  return conditions;
}
module.exports = { CATEGORIES, SPECIALIZATIONS, normalizeProvince, specializationPattern, jobSearchConditions };
