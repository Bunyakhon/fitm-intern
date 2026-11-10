const PROFICIENCY_LABELS = { very_good: "ดีมาก", good: "ดี", moderate: "ปานกลาง", fair: "พอใช้" };
const plain = (value) => typeof value?.get === "function" ? value.get({ plain: true }) : value;

function matchingSource(student) {
  const saved = plain(student);
  const computerSkills = (saved?.profileSkills || [])
    .map(plain)
    .filter((skill) => skill.category === "computer" && typeof skill.skill_name === "string" && skill.skill_name.trim())
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || String(a.id).localeCompare(String(b.id)))
    .map((skill) => ({ id: skill.id, skill_name: skill.skill_name,
      proficiency: skill.proficiency ?? null, proficiency_label: PROFICIENCY_LABELS[skill.proficiency] || null }));
  return {
    major: typeof saved?.major === "string" ? saved.major : null,
    related_skills: typeof saved?.profile?.related_skills === "string" ? saved.profile.related_skills : null,
    computer_skills: computerSkills,
  };
}

function readMatchingStudent(id, { StudentModel, StudentProfileModel, StudentSkillModel }) {
  // One saved-data projection shared by the display API and analysis. No draft,
  // profile mutation, broad aggregate/PII query or new skill records.
  return StudentModel.findByPk(id, {
    attributes: ["id", "major"],
    include: [
      { model: StudentProfileModel, as: "profile", attributes: ["related_skills"], required: false },
      { model: StudentSkillModel, as: "profileSkills", where: { category: "computer" },
        attributes: ["id", "category", "skill_name", "proficiency", "display_order"], required: false },
    ],
  });
}

module.exports = { matchingSource, readMatchingStudent };
