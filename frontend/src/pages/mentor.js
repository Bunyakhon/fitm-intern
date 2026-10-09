import {
  confirmMentorVerification,
  updateMentorProfile,
  verifyMentorToken,
} from "../api/mentorVerification.api.js";
import { setButtonLoading, showConfirmModal, showToast } from "../ui/feedback.js";

const form = document.getElementById("mentorVerificationForm");
const fieldset = document.getElementById("mentorFieldset");
const content = document.getElementById("mentorContent");
const state = document.getElementById("verificationState");
const stateMessage = document.getElementById("verificationStateMessage");
const emailInput = document.getElementById("mentorEmail");
const firstNameInput = document.getElementById("mentorFirstName");
const lastNameInput = document.getElementById("mentorLastName");
const positionInput = document.getElementById("mentorPosition");
const saveButton = document.getElementById("saveProfileButton");
const confirmButton = document.getElementById("confirmVerificationButton");
const studentName = document.getElementById("studentName");

import { initMentorInternshipReview } from "./mentorInternshipReview.js";
import { initMentorSupervision } from "./mentorSupervision.js";
const reviewToken = new URLSearchParams(window.location.hash.slice(1)).get("review_token");
const appointmentToken = new URLSearchParams(window.location.hash.slice(1)).get("appointment_token");
let verificationToken = null;
let isSaving = false;
let isConfirming = false;
let isVerified = false;

const defaultSaveLabel = "บันทึกการแก้ไข";
const defaultConfirmLabel = "ยืนยันข้อมูล";

function setState(type, message) {
  state.className = `verification-state is-${type}`;
  stateMessage.textContent = message;
}

function setFormEnabled(enabled) {
  fieldset.disabled = !enabled;
  saveButton.disabled = !enabled;
  confirmButton.disabled = !enabled;
}

function clearInvalidFields() {
  [emailInput, firstNameInput, lastNameInput, positionInput].forEach((input) => {
    input.removeAttribute("aria-invalid");
  });
}

function markInvalid(input) {
  input.setAttribute("aria-invalid", "true");
}

function getProfileData() {
  return {
    email: emailInput.value.trim(),
    first_name: firstNameInput.value.trim(),
    last_name: lastNameInput.value.trim(),
    position: positionInput.value.trim(),
  };
}

function validateProfile(data) {
  clearInvalidFields();

  if (!data.email || !data.first_name || !data.last_name || !data.position) {
    const firstEmpty = [emailInput, firstNameInput, lastNameInput, positionInput].find(
      (input) => !input.value.trim(),
    );
    markInvalid(firstEmpty);
    firstEmpty.focus();
    setState("error", "กรุณากรอกอีเมล ชื่อ นามสกุล และตำแหน่งให้ครบถ้วน");
    return false;
  }

  if (!emailInput.validity.valid) {
    markInvalid(emailInput);
    emailInput.focus();
    setState("error", "กรุณากรอกอีเมลให้ถูกต้อง");
    return false;
  }

  return true;
}

function populateProfile(mentor) {
  emailInput.value = mentor?.email || "";
  firstNameInput.value = mentor?.first_name || "";
  lastNameInput.value = mentor?.last_name || "";
  positionInput.value = mentor?.position || "";
}

function populateStudent(student) {
  const name = [student?.first_name, student?.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim())
    .join(" ");

  studentName.textContent = name || "ไม่พบข้อมูลนักศึกษา";
}

function getErrorMessage(error) {
  if (!error?.status) {
    return "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง";
  }

  if (error.status >= 500) {
    return "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
  }

  if (error.status === 410) {
    if (/expired|หมดอายุ/i.test(error.data?.message || "")) {
      return "ลิงก์ยืนยันข้อมูลหมดอายุแล้ว";
    }

    return "ลิงก์ยืนยันข้อมูลนี้ถูกใช้งานแล้ว";
  }

  if (error.status === 404) {
    return "ลิงก์ยืนยันข้อมูลไม่ถูกต้อง";
  }

  if (error.status === 400) {
    return error.data?.message || "คำขอไม่ถูกต้อง กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง";
  }

  if (error.status === 401 || error.status === 403) {
    return error.data?.message || "ไม่มีสิทธิ์ดำเนินการด้วยลิงก์นี้";
  }

  return error.data?.message || "ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง";
}

function handleTerminalTokenError(error) {
  return error?.status === 404 || error?.status === 410;
}

function disableAfterTerminalTokenError(error) {
  if (handleTerminalTokenError(error)) {
    verificationToken = null;
    setFormEnabled(false);
  }
}

function clearTokenFromAddressBar() {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete("token");
  window.history.replaceState(
    null,
    document.title,
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
  );
}

function startAutoClose() {
  setState("verified", "ยืนยันข้อมูลเรียบร้อย ระบบกำลังปิดหน้านี้...");

  window.setTimeout(() => {
    window.close();

    window.setTimeout(() => {
      setState("verified", "ยืนยันข้อมูลเรียบร้อยแล้ว สามารถปิดหน้านี้ได้");
    }, 250);
  }, 1800);
}

async function loadVerification() {
  const token = new URLSearchParams(window.location.search).get("token")?.trim();

  if (!token) {
    setState("error", "ไม่พบลิงก์ยืนยันข้อมูลพี่เลี้ยง");
    setFormEnabled(false);
    return;
  }

  verificationToken = token;
  setState("loading", "กำลังตรวจสอบลิงก์ยืนยันข้อมูล...");

  try {
    const result = await verifyMentorToken(verificationToken);
    const mentor = result?.data?.mentor;

    if (!mentor) {
      throw new Error("ไม่พบข้อมูลพี่เลี้ยง");
    }

    populateProfile(mentor);
    populateStudent(mentor.student);
    content.hidden = false;
    setFormEnabled(true);
    setState("success", "ตรวจสอบลิงก์สำเร็จ กรุณาตรวจสอบข้อมูลก่อนยืนยัน");
  } catch (error) {
    setState("error", getErrorMessage(error));
    disableAfterTerminalTokenError(error);
  }
}

async function saveProfile(event) {
  event.preventDefault();

  if (!verificationToken || isSaving || isConfirming || isVerified) {
    return;
  }

  const profile = getProfileData();

  if (!validateProfile(profile)) {
    return;
  }

  isSaving = true;
  fieldset.disabled = true;
  setButtonLoading(saveButton, true, "กำลังบันทึก...", defaultSaveLabel);
  confirmButton.disabled = true;
  setState("loading", "กำลังบันทึกข้อมูลพี่เลี้ยง...");

  try {
    const result = await updateMentorProfile(verificationToken, profile);
    populateProfile(result?.data?.mentor || profile);
    setState("success", "บันทึกการแก้ไขข้อมูลพี่เลี้ยงสำเร็จ");
  } catch (error) {
    setState("error", getErrorMessage(error));
    disableAfterTerminalTokenError(error);
  } finally {
    isSaving = false;
    setButtonLoading(saveButton, false, "", defaultSaveLabel);

    if (!isVerified && verificationToken) {
      fieldset.disabled = false;
      confirmButton.disabled = false;
    }
  }
}

async function submitConfirmation() {
  if (!verificationToken || isSaving || isConfirming || isVerified) {
    return;
  }

  isConfirming = true;
  setFormEnabled(false);
  setButtonLoading(confirmButton, true, "กำลังยืนยัน...", defaultConfirmLabel);
  setState("loading", "กำลังยืนยันข้อมูลพี่เลี้ยง...");

  try {
    const result = await confirmMentorVerification(verificationToken);
    populateProfile(result?.data?.mentor || getProfileData());
    isVerified = true;
    verificationToken = null;
    clearTokenFromAddressBar();
    saveButton.textContent = defaultSaveLabel;
    confirmButton.textContent = "ยืนยันข้อมูลแล้ว";
    showToast("ยืนยันข้อมูลพี่เลี้ยงเรียบร้อยแล้ว", "success");
    startAutoClose();
  } catch (error) {
    setState("error", getErrorMessage(error));
    disableAfterTerminalTokenError(error);
  } finally {
    isConfirming = false;

    if (!isVerified) {
      setButtonLoading(confirmButton, false, "", defaultConfirmLabel);

      if (verificationToken) {
        setFormEnabled(true);
      }
    }
  }
}

function confirmProfile() {
  if (!verificationToken || isSaving || isConfirming || isVerified) {
    return;
  }

  showConfirmModal({
    title: "ยืนยันข้อมูลพี่เลี้ยง",
    message: "โปรดตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน การยืนยันนี้ไม่สามารถย้อนกลับได้",
    confirmLabel: "ยืนยันข้อมูล",
    loadingLabel: "กำลังยืนยัน...",
    onConfirm: submitConfirmation,
  });
}

form.addEventListener("submit", saveProfile);
confirmButton.addEventListener("click", confirmProfile);

if (appointmentToken) {
  window.history.replaceState({}, "", window.location.pathname);
  initMentorSupervision(appointmentToken);
} else if (reviewToken) {
  window.history.replaceState(null, document.title, window.location.pathname);
  initMentorInternshipReview(reviewToken);
} else loadVerification();
