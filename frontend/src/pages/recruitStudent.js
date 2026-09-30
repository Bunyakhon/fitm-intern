import { setButtonLoading, showToast } from "../ui/feedback.js";
import { submitRecruitment } from "../api/recruitStudent.api.js";

const recruitForm = document.getElementById("recruitForm");
const jobCards = document.getElementById("jobCards");
const addJobButton = document.getElementById("addJobButton");
const submitButton = document.getElementById("recruitSubmitButton");
const turnstileContainer = document.getElementById("turnstileContainer");
const turnstileStatus = document.getElementById("turnstileStatus");
const submissionStatus = document.getElementById("recruitSubmissionStatus");
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const MAX_JOB_POSTINGS = 10;

let nextJobCardKey = 1;
let captchaToken = "";
let turnstileWidgetId = null;
let isSubmitting = false;
let submissionRecorded = false;

function setTurnstileStatus(message = "") {
  turnstileStatus.textContent = message;
}

function showSubmissionStatus(message, type = "success") {
  submissionStatus.textContent = message;
  submissionStatus.hidden = false;
  submissionStatus.classList.toggle("is-warning", type === "warning");
}

function getTurnstileApi() {
  return window.turnstile;
}

function resetTurnstile() {
  captchaToken = "";
  const turnstile = getTurnstileApi();
  if (turnstile && turnstileWidgetId !== null) {
    turnstile.reset(turnstileWidgetId);
  }
}

function renderTurnstile() {
  const turnstile = getTurnstileApi();
  if (!turnstile || turnstileWidgetId !== null) {
    return;
  }
  if (!turnstileSiteKey) {
    setTurnstileStatus("ไม่พบการตั้งค่าการยืนยันความปลอดภัย กรุณาลองใหม่ภายหลัง");
    return;
  }

  turnstileWidgetId = turnstile.render(turnstileContainer, {
    sitekey: turnstileSiteKey,
    callback(token) {
      captchaToken = token;
      setTurnstileStatus("");
    },
    "expired-callback"() {
      captchaToken = "";
      setTurnstileStatus("การยืนยันหมดอายุ กรุณายืนยันอีกครั้ง");
    },
    "error-callback"() {
      captchaToken = "";
      setTurnstileStatus("ไม่สามารถยืนยันความปลอดภัยได้ กรุณาลองใหม่อีกครั้ง");
    },
  });
}

function initializeTurnstile() {
  const script = document.getElementById("turnstileScript");
  if (getTurnstileApi()) {
    renderTurnstile();
    return;
  }
  if (!script) {
    setTurnstileStatus("ไม่สามารถโหลดการยืนยันความปลอดภัยได้ กรุณาลองใหม่อีกครั้ง");
    return;
  }
  script.addEventListener("load", renderTurnstile, { once: true });
  script.addEventListener(
    "error",
    () => setTurnstileStatus("ไม่สามารถโหลดการยืนยันความปลอดภัยได้ กรุณาลองใหม่อีกครั้ง"),
    { once: true },
  );
}

function getJobCardKey() {
  const key = `job-${nextJobCardKey}`;
  nextJobCardKey += 1;
  return key;
}

function createJobCard() {
  const key = getJobCardKey();
  const card = document.createElement("article");

  card.className = "recruit-job-card";
  card.dataset.jobKey = key;
  card.innerHTML = `
    <div class="recruit-job-card__header">
      <div>
        <p class="recruit-job-card__eyebrow">JOB POSTING</p>
        <h3 class="recruit-job-card__title">ตำแหน่งที่ 1</h3>
      </div>
      <button class="recruit-remove-job" type="button" hidden>
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        ลบตำแหน่ง
      </button>
    </div>

    <div class="recruit-fields recruit-fields--job">
      <div class="recruit-field">
        <label for="${key}-title">ชื่อตำแหน่ง <span aria-hidden="true">*</span></label>
        <input id="${key}-title" name="${key}-title" type="text" required data-job-field="title" />
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field">
        <label for="${key}-category">หมวดหมู่งาน <span aria-hidden="true">*</span></label>
        <select id="${key}-category" name="${key}-category" required data-job-field="category">
          <option value="">เลือกหมวดหมู่งาน</option>
          <option value="information_technology">เทคโนโลยีสารสนเทศ</option>
          <option value="business">ธุรกิจและการจัดการ</option>
          <option value="design">ออกแบบและสื่อดิจิทัล</option>
          <option value="engineering">วิศวกรรม</option>
          <option value="other">อื่น ๆ</option>
        </select>
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field recruit-field--wide">
        <label for="${key}-description">รายละเอียดงาน <span aria-hidden="true">*</span></label>
        <textarea id="${key}-description" name="${key}-description" rows="5" required data-job-field="description" placeholder="อธิบายลักษณะงาน ความรับผิดชอบ และคุณสมบัติที่เกี่ยวข้อง"></textarea>
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field">
        <label for="${key}-quota">จำนวนที่รับ <span aria-hidden="true">*</span></label>
        <input id="${key}-quota" name="${key}-quota" type="number" min="1" step="1" inputmode="numeric" required data-job-field="quota" placeholder="เช่น 2" />
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field">
        <label for="${key}-compensation">เบี้ยเลี้ยง / ค่าตอบแทน <span aria-hidden="true">*</span></label>
        <input id="${key}-compensation" name="${key}-compensation" type="text" required data-job-field="compensation" placeholder="เช่น 300 บาท/วัน, ตามตกลง หรือ ไม่ระบุ" />
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field">
        <label for="${key}-work-days">จำนวนวันทำงาน / สัปดาห์ <span aria-hidden="true">*</span></label>
        <select id="${key}-work-days" name="${key}-work-days" required data-job-field="workDaysPerWeek">
          <option value="">เลือกจำนวนวัน</option>
          <option value="1">1 วัน/สัปดาห์</option>
          <option value="2">2 วัน/สัปดาห์</option>
          <option value="3">3 วัน/สัปดาห์</option>
          <option value="4">4 วัน/สัปดาห์</option>
          <option value="5">5 วัน/สัปดาห์</option>
          <option value="6">6 วัน/สัปดาห์</option>
          <option value="7">7 วัน/สัปดาห์</option>
        </select>
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <fieldset class="recruit-field recruit-work-modes" data-job-work-modes>
        <legend>รูปแบบการทำงาน <span aria-hidden="true">*</span></legend>
        <div class="recruit-work-modes__options">
          <label><input type="checkbox" value="onsite" data-work-mode /> On-site</label>
          <label><input type="checkbox" value="work_from_home" data-work-mode /> Work From Home</label>
          <label><input type="checkbox" value="hybrid" data-work-mode /> Hybrid</label>
        </div>
        <p class="recruit-field__error" aria-live="polite"></p>
      </fieldset>
    </div>
  `;

  card.querySelector(".recruit-remove-job").addEventListener("click", () => {
    card.remove();
    updateJobCardLabels();
  });

  card.querySelectorAll("input, select, textarea").forEach((control) => {
    control.addEventListener("input", () => clearFieldError(control));
    control.addEventListener("change", () => clearFieldError(control));
  });

  return card;
}

function updateJobCardLabels() {
  const cards = [...jobCards.querySelectorAll(".recruit-job-card")];

  cards.forEach((card, index) => {
    card.querySelector(".recruit-job-card__title").textContent = `ตำแหน่งที่ ${index + 1}`;
    card.querySelector(".recruit-remove-job").hidden = cards.length === 1;
  });
  addJobButton.disabled = cards.length >= MAX_JOB_POSTINGS;
  addJobButton.setAttribute("aria-disabled", String(cards.length >= MAX_JOB_POSTINGS));
}

function getFieldContainer(control) {
  return control.closest(".recruit-field");
}

function setFieldError(control, message) {
  const field = getFieldContainer(control);

  if (!field) {
    return;
  }

  field.classList.add("is-invalid");
  const error = field.querySelector(".recruit-field__error");
  if (error) {
    error.textContent = message;
  }
  control.setAttribute("aria-invalid", "true");
}

function clearFieldError(control) {
  const field = getFieldContainer(control);

  if (!field) {
    return;
  }

  field.classList.remove("is-invalid");
  field.querySelector(".recruit-field__error").textContent = "";
  control.removeAttribute("aria-invalid");
}

function validationMessage(control) {
  if (control.validity.valueMissing) {
    return "กรุณากรอกข้อมูลในช่องนี้";
  }
  if (control.validity.typeMismatch) {
    return "กรุณากรอกรูปแบบข้อมูลให้ถูกต้อง";
  }
  if (control.validity.rangeUnderflow || control.validity.stepMismatch) {
    return "กรุณาระบุจำนวนเต็มอย่างน้อย 1";
  }
  return "กรุณาตรวจสอบข้อมูลอีกครั้ง";
}

function validateControl(control) {
  clearFieldError(control);

  if (control.checkValidity()) {
    return true;
  }

  setFieldError(control, validationMessage(control));
  return false;
}

function validateWorkModes(card) {
  const group = card.querySelector("[data-job-work-modes]");
  const modes = [...group.querySelectorAll("[data-work-mode]")];
  const hasSelection = modes.some((mode) => mode.checked);

  group.classList.toggle("is-invalid", !hasSelection);
  group.querySelector(".recruit-field__error").textContent = hasSelection
    ? ""
    : "กรุณาเลือกรูปแบบการทำงานอย่างน้อย 1 รูปแบบ";
  modes.forEach((mode) => {
    mode.toggleAttribute("aria-invalid", !hasSelection);
  });

  return hasSelection;
}

function validateRecruitForm() {
  const companyIsValid = [...recruitForm.querySelectorAll("[data-company-field]")]
    .map(validateControl)
    .every(Boolean);
  const cardResults = [...jobCards.querySelectorAll(".recruit-job-card")].map((card) => {
    const fieldsAreValid = [...card.querySelectorAll("[data-job-field]")]
      .map(validateControl)
      .every(Boolean);
    return fieldsAreValid && validateWorkModes(card);
  });

  return companyIsValid && cardResults.every(Boolean);
}

function valueFromForm(name) {
  return recruitForm.elements.namedItem(name).value.trim();
}

const companyFieldNames = {
  name: "companyName",
  email: "companyEmail",
  phone: "companyPhone",
  addressNo: "addressNo",
  moo: "companyMoo",
  subdistrict: "companySubdistrict",
  district: "companyDistrict",
  province: "companyProvince",
};

function applyBackendValidationErrors(errors = []) {
  errors.forEach(({ path }) => {
    const companyMatch = /^company\.([A-Za-z]+)$/.exec(path);
    if (companyMatch && companyFieldNames[companyMatch[1]]) {
      setFieldError(
        recruitForm.elements.namedItem(companyFieldNames[companyMatch[1]]),
        "ข้อมูลในช่องนี้ไม่ถูกต้อง",
      );
      return;
    }

    const jobMatch = /^jobPostings\[(\d+)\]\.([A-Za-z]+)(?:\[\d+\])?$/.exec(path);
    if (jobMatch) {
      const card = jobCards.querySelectorAll(".recruit-job-card")[Number(jobMatch[1])];
      if (!card) return;
      const field = jobMatch[2];
      const control = field === "workModes"
        ? card.querySelector("[data-job-work-modes]")
        : card.querySelector(`[data-job-field="${field}"]`);
      if (control) setFieldError(control, "ข้อมูลในช่องนี้ไม่ถูกต้อง");
      return;
    }

    if (path === "captchaToken") {
      setTurnstileStatus("กรุณายืนยันความปลอดภัยก่อนส่งข้อมูล");
    }
  });
}

function displaySubmissionError(error) {
  const status = error.status;
  if (status === 400) {
    if (Array.isArray(error.data?.errors)) {
      applyBackendValidationErrors(error.data.errors);
      showToast("กรุณาตรวจสอบข้อมูลที่ระบุ", "error");
    } else {
      setTurnstileStatus("การยืนยันความปลอดภัยไม่ผ่าน กรุณายืนยันอีกครั้ง");
      showToast("ไม่สามารถยืนยันความปลอดภัยได้", "error");
    }
    return;
  }
  if (status === 403) {
    setTurnstileStatus("การยืนยันความปลอดภัยไม่ผ่าน กรุณายืนยันอีกครั้ง");
    showToast("การยืนยันความปลอดภัยไม่ผ่าน", "error");
    return;
  }
  if (status === 429) {
    const retryAfter = Number(error.retryAfter);
    const suffix = Number.isFinite(retryAfter) && retryAfter > 0
      ? ` กรุณาลองใหม่ในอีกประมาณ ${retryAfter} วินาที`
      : " กรุณารอสักครู่แล้วลองใหม่";
    showToast(`ส่งคำขอบ่อยเกินไป${suffix}`, "error");
    return;
  }
  if (status === 503) {
    if (error.data?.message === "Recruitment submission is temporarily unavailable") {
      showToast("ระบบรับสมัครยังไม่เปิดใช้งานในขณะนี้", "error");
    } else {
      showToast("ระบบยืนยันความปลอดภัยไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง", "error");
    }
    return;
  }
  if (status && status >= 500) {
    showToast("ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง", "error");
    return;
  }
  showToast("ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง", "error");
}

export function buildRecruitPayload(token = captchaToken) {
  return {
    company: {
      name: valueFromForm("companyName"),
      email: valueFromForm("companyEmail"),
      phone: valueFromForm("companyPhone"),
      addressNo: valueFromForm("addressNo"),
      moo: valueFromForm("companyMoo"),
      subdistrict: valueFromForm("companySubdistrict"),
      district: valueFromForm("companyDistrict"),
      province: valueFromForm("companyProvince"),
    },
    jobPostings: [...jobCards.querySelectorAll(".recruit-job-card")].map((card) => ({
      title: card.querySelector('[data-job-field="title"]').value.trim(),
      category: card.querySelector('[data-job-field="category"]').value,
      description: card.querySelector('[data-job-field="description"]').value.trim(),
      quota: Number(card.querySelector('[data-job-field="quota"]').value),
      compensation: card.querySelector('[data-job-field="compensation"]').value.trim(),
      workDaysPerWeek: Number(card.querySelector('[data-job-field="workDaysPerWeek"]').value),
      workModes: [...card.querySelectorAll("[data-work-mode]:checked")].map((mode) => mode.value),
    })),
    captchaToken: token,
  };
}

addJobButton.addEventListener("click", () => {
  if (jobCards.querySelectorAll(".recruit-job-card").length >= MAX_JOB_POSTINGS) {
    showToast("เพิ่มตำแหน่งงานได้ไม่เกิน 10 ตำแหน่ง", "error");
    return;
  }
  jobCards.append(createJobCard());
  updateJobCardLabels();
  jobCards.lastElementChild.querySelector('[data-job-field="title"]').focus();
});

recruitForm.querySelectorAll("[data-company-field]").forEach((control) => {
  control.addEventListener("input", () => clearFieldError(control));
  control.addEventListener("change", () => clearFieldError(control));
});

recruitForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting || submissionRecorded) {
    return;
  }

  if (!validateRecruitForm()) {
    showToast("กรุณาตรวจสอบข้อมูลที่จำเป็นในแบบฟอร์ม", "error");
    recruitForm.querySelector(".is-invalid input, .is-invalid select, .is-invalid textarea")?.focus();
    return;
  }

  if (!captchaToken) {
    setTurnstileStatus("กรุณายืนยันความปลอดภัยก่อนส่งข้อมูล");
    showToast("กรุณายืนยันความปลอดภัยก่อนส่งข้อมูล", "error");
    return;
  }

  isSubmitting = true;
  setButtonLoading(submitButton, true, "กำลังส่งข้อมูล...", "ส่งข้อมูลสำหรับยืนยันอีเมล");
  try {
    const result = await submitRecruitment(buildRecruitPayload());
    submissionRecorded = true;

    if (result.status === 201) {
      showSubmissionStatus(
        "ส่งข้อมูลเรียบร้อยแล้ว กรุณาตรวจสอบอีเมลของสถานประกอบการเพื่อยืนยันก่อนเข้าสู่ขั้นตอนตรวจสอบ",
      );
      showToast("ส่งข้อมูลเรียบร้อยแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยัน", "success");
    } else {
      showSubmissionStatus(
        "ระบบบันทึกข้อมูลเรียบร้อยแล้ว แต่ยังส่งอีเมลยืนยันไม่ได้ในขณะนี้ กรุณาอย่าส่งแบบฟอร์มซ้ำ",
        "warning",
      );
      showToast("ระบบบันทึกข้อมูลแล้ว แต่การส่งอีเมลยืนยันยังขัดข้อง", "error");
    }
  } catch (error) {
    displaySubmissionError(error);
  } finally {
    isSubmitting = false;
    resetTurnstile();
    setButtonLoading(submitButton, false, "กำลังส่งข้อมูล...", "ส่งข้อมูลสำหรับยืนยันอีเมล");
    if (submissionRecorded) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-disabled", "true");
      submitButton.textContent = "ส่งข้อมูลแล้ว";
    }
  }
});

jobCards.append(createJobCard());
updateJobCardLabels();
initializeTurnstile();
