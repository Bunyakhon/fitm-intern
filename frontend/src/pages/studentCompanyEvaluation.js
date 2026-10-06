const SCORE_FIELDS = [1, 2, 3, 4, 5].map(n => `q${n}_score`);

export function initCompanyEvaluation({ document, getEvaluation, saveEvaluation, showToast, setButtonLoading, formatDate }) {
  const form = document.getElementById("companyEvaluationForm");
  if (!form) return { load: async () => false };
  const controls = SCORE_FIELDS.map((_, index) => document.getElementById(`evaluationQ${index + 1}`));
  const comment = document.getElementById("evaluationComment");
  const button = document.getElementById("saveEvaluationBtn");
  const message = document.getElementById("evaluationMessage");
  let loaded = false, saving = false, loading = null;
  const text = (id, value) => { document.getElementById(id).textContent = value; };
  const displayValue = value => typeof value === "string" && value.trim() ? value.trim() : "-";
  function displayDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(value)) return "-";
    const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== value.slice(0, 10)) return "-";
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
    if (!Number.isFinite(date.getTime()) || (dateOnly && date.toISOString().slice(0, 10) !== value)) return "-";
    return formatDate(value);
  }
  function feedback(value, type = "") {
    message.textContent = value;
    message.className = `message ${type}`;
  }
  function busy(value) {
    form.setAttribute("aria-busy", String(value));
    [...controls, comment].forEach(control => { control.disabled = value || !loaded; });
    button.disabled = value || !loaded;
  }
  function scores() {
    return controls.map(control => /^([1-9]|10)$/.test(control.value) ? Number(control.value) : null);
  }
  function summary() {
    const total = scores().reduce((sum, value) => sum + (value || 0), 0);
    text("evaluationTotal", `${total} / 50`);
    text("evaluationAverage", `${(total / 5).toFixed(2)} / 10`);
  }
  function populate(data) {
    if (typeof data?.student?.name !== "string" || !data.display ||
        (data.evaluation !== null && (!data.evaluation || SCORE_FIELDS.some(key => !Number.isInteger(data.evaluation[key]) || data.evaluation[key] < 1 || data.evaluation[key] > 10) || typeof data.evaluation.comment !== "string"))) {
      throw new Error("ข้อมูลแบบประเมินไม่ครบถ้วน กรุณาโหลดใหม่");
    }
    text("evaluationStudentName", displayValue(data.student.name));
    text("evaluationMentorName", displayValue(data.mentor?.name));
    for (const [id, key] of Object.entries({ evaluationStudentId: "student_id", evaluationMajor: "major", evaluationCompany: "company_name", evaluationMentorPosition: "mentor_position" })) {
      text(id, displayValue(data.display[key]));
    }
    const start = displayDate(data.display.work_start_date), end = displayDate(data.display.work_end_date);
    text("evaluationWorkPeriod", start !== "-" && end !== "-" && data.display.work_end_date >= data.display.work_start_date ? `${start} - ${end}` : "-");
    text("evaluationDate", displayDate(data.display.evaluation_date));
    controls.forEach((control, index) => { control.value = data.evaluation ? String(data.evaluation[SCORE_FIELDS[index]]) : ""; });
    comment.value = data.evaluation?.comment || "";
    summary();
  }
  function load() {
    if (saving) return Promise.resolve(false);
    if (loading) return loading;
    loaded = false;
    busy(true);
    feedback("กำลังโหลดแบบประเมิน...", "loading");
    loading = (async () => {
      try {
        populate(await getEvaluation());
        loaded = true;
        feedback("");
        return true;
      } catch (error) {
        feedback(error.message || "ไม่สามารถโหลดแบบประเมินได้", "error");
        return false;
      } finally {
        loading = null;
        busy(false);
      }
    })();
    return loading;
  }
  async function save(event) {
    event.preventDefault();
    if (saving || loading || !loaded) return;
    const values = scores();
    const trimmed = comment.value.trim();
    if (values.some(value => value === null)) {
      feedback("กรุณาเลือกคะแนน 1–10 ให้ครบทั้ง 5 ข้อ", "error");
      controls[values.indexOf(null)].focus();
      return;
    }
    if ([...trimmed].length > 2000 || trimmed.includes("\0")) {
      feedback("ข้อเสนอแนะต้องไม่เกิน 2,000 ตัวอักษรและไม่มีอักขระว่าง", "error");
      comment.focus();
      return;
    }
    saving = true;
    busy(true);
    setButtonLoading(button, true, "กำลังบันทึก...", "บันทึกแบบประเมิน");
    feedback("กำลังบันทึกแบบประเมิน...", "loading");
    try {
      const payload = { ...Object.fromEntries(SCORE_FIELDS.map((key, index) => [key, values[index]])), comment: trimmed };
      const saved = await saveEvaluation(payload);
      populate(saved);
      // Distinguish a committed save from a failed refresh; never claim it failed to save.
      try {
        populate(await getEvaluation());
        feedback("บันทึกแบบประเมินเรียบร้อยแล้ว", "success");
        showToast("บันทึกแบบประเมินเรียบร้อยแล้ว", "success");
      } catch (error) {
        feedback(`บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ: ${error.message || "กรุณาเปิดเมนูใหม่"}`, "error");
        showToast("บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ", "warning");
      }
    } catch (error) {
      feedback(error.message || "ไม่สามารถบันทึกแบบประเมินได้", "error");
      showToast(error.message || "ไม่สามารถบันทึกแบบประเมินได้", "error");
    } finally {
      saving = false;
      setButtonLoading(button, false);
      busy(false);
    }
  }
  controls.forEach(control => control.addEventListener("change", summary));
  form.addEventListener("submit", save);
  busy(false);
  summary();
  return { load };
}
