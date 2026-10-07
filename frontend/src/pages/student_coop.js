import { getCurrentStudent } from "../api/auth.api.js";
import { getMyJobMatches } from "../api/jobMatching.api.js";
import {
  getMyStudentProfile,
  getStudentProfileImage,
  uploadStudentResume,
  updateMyStudentProfile,
  updateStudentInfo,
  uploadStudentProfileImage,
} from "../api/studentProfile.api.js";
import { getTeachers } from "../api/teacher.api.js";
import { getMyCompanyEvaluation, saveMyCompanyEvaluation } from "../api/studentCoop.api.js";
import { initCompanyEvaluation } from "./studentCompanyEvaluation.js";
import { getMyCoopProject, saveMyCoopProject, getMyProjectAdvisorRequest, requestMyProjectAdvisor, getMyCoopProjectFiles, uploadMyCoopProjectFile, previewMyCoopProjectFile } from "../api/studentCoop.api.js";
import {
  createMentor,
  deleteMyMentor,
  getMyMentor,
  updateMyMentor,
} from "../api/mentor.api.js";
import {
  cancelCoopRequest,
  createCoopRequest,
  searchCompanies,
  checkCompanyDuplicate,
  getPublishedJobPostingForCoopRequest,
  getCoopRequestById,
  getMyCoopRequests,
} from "../api/coopRequest.api.js";
import { setButtonLoading, showActionModal, showConfirmModal, showToast } from "../ui/feedback.js";

console.log("KIWI student cooperative dashboard loaded");

const companyEvaluation = initCompanyEvaluation({ document, getEvaluation: getMyCompanyEvaluation, saveEvaluation: saveMyCompanyEvaluation, showToast, setButtonLoading, formatDate });

// ==============================
// Elements
// ==============================

const userNameDisplay =
  document.getElementById("userNameDisplay");

const overviewGreeting =
  document.getElementById("overviewGreeting");

const logoutBtn =
  document.getElementById("logoutBtn");

// ==============================
// Profile - Student
// ==============================

const profileFullName =
  document.getElementById("profileFullName");

const profilePrefix =
  document.getElementById("profilePrefix");

const profileStudentId =
  document.getElementById("profileStudentId");

const profileEmail =
  document.getElementById("profileEmail");

const profileFirstName =
  document.getElementById("profileFirstName");

const profileLastName =
  document.getElementById("profileLastName");

const profileStudentIdDetail =
  document.getElementById("profileStudentIdDetail");

const profileEmailDetail =
  document.getElementById("profileEmailDetail");

const profileMajor =
  document.getElementById("profileMajor");

const profileYear =
  document.getElementById("profileYear");

const profileGpa =
  document.getElementById("profileGpa");

const profileTrack =
  document.getElementById("profileTrack");

const studentStatus =
  document.getElementById("studentStatus");

// ==============================
// Profile - StudentProfile
// ==============================

const profileBirthDate =
  document.getElementById("profileBirthDate");

const profileAge =
  document.getElementById("profileAge");

const profileHeight =
  document.getElementById("profileHeight");

const profileWeight =
  document.getElementById("profileWeight");

const profileNationality =
  document.getElementById("profileNationality");

const profileEthnicity =
  document.getElementById("profileEthnicity");

const profileReligion =
  document.getElementById("profileReligion");

const profileBloodType =
  document.getElementById("profileBloodType");

const profileMedicalConditions =
  document.getElementById("profileMedicalConditions");

const profileAllergies =
  document.getElementById("profileAllergies");

const profileSpecialAbilities =
  document.getElementById("profileSpecialAbilities");

const profileRelatedSkills =
  document.getElementById("profileRelatedSkills");

const profileHometownAddress =
  document.getElementById("profileHometownAddress");

const profileHometownPhone =
  document.getElementById("profileHometownPhone");

const profileCurrentAddress =
  document.getElementById("profileCurrentAddress");

const profileCurrentPhone =
  document.getElementById("profileCurrentPhone");

const profileFatherName =
  document.getElementById("profileFatherName");

const profileFatherAge =
  document.getElementById("profileFatherAge");

const profileFatherOccupation =
  document.getElementById("profileFatherOccupation");

const profileMotherName =
  document.getElementById("profileMotherName");

const profileMotherAge =
  document.getElementById("profileMotherAge");

const profileMotherOccupation =
  document.getElementById("profileMotherOccupation");

const profileParentAddress =
  document.getElementById("profileParentAddress");

const profileParentPhone =
  document.getElementById("profileParentPhone");

const profileEmergencyName =
  document.getElementById("profileEmergencyName");

const profileEmergencyRelation =
  document.getElementById("profileEmergencyRelation");

const profileEmergencyAddress =
  document.getElementById("profileEmergencyAddress");

const profileEmergencyPhone =
  document.getElementById("profileEmergencyPhone");

// ==============================
// Profile Edit Modal
// ==============================

let currentStudentProfile = null;
let currentStudent = null;
let selectedProfileImageFile = null;
let profileImageObjectUrl = null;

const btnEditProfile =
  document.getElementById("btnEditProfile");

const profileEditModal =
  document.getElementById("profileEditModal");

const closeProfileEditModal =
  document.getElementById("closeProfileEditModal");

const cancelProfileEditBtn =
  document.getElementById("cancelProfileEditBtn");

const saveProfileBtn =
  document.getElementById("saveProfileBtn");

const profileEditMessage =
  document.getElementById("profileEditMessage");

const studentInfoForm = document.getElementById("studentInfoForm");
const studentFullNameInput = document.getElementById("studentFullName");
const studentIdInput = document.getElementById("studentIdInput");
const studentEmailInput = document.getElementById("studentEmailInput");
const studentMajorInput = document.getElementById("studentMajorInput");
const studentYearLevelInput = document.getElementById("studentYearLevelInput");
const studentGpaInput = document.getElementById("studentGpaInput");
const studentAdvisorInput = document.getElementById("studentAdvisorInput");
const studentCoopAdvisorInput = document.getElementById("studentCoopAdvisorInput");
const studentInfoMessage = document.getElementById("studentInfoMessage");
const profileAvatarButton = document.getElementById("profileAvatarButton");
const profileAvatarImage = document.getElementById("profileAvatarImage");
const profileAvatarPlaceholder = document.getElementById("profileAvatarPlaceholder");
const modalProfileImage = document.getElementById("modalProfileImage");
const modalProfileImagePlaceholder = document.getElementById("modalProfileImagePlaceholder");
const profileImageEditorSection = document.getElementById("profileImageEditorSection");
const profileImageInput = document.getElementById("profileImageInput");
const uploadProfileImageBtn = document.getElementById("uploadProfileImageBtn");
const profileImageMessage = document.getElementById("profileImageMessage");
const profilePanel = document.getElementById("panel-profile");
const profileLoadMessage = document.getElementById("profileLoadMessage");

let isStudentInfoSaving = false;
let isTeacherDirectoryLoaded = false;
let hasAdvisorSelectionChanged = false;
let isProfileImageUploading = false;
let isStudentProfileSaving = false;

// ==============================
// Authentication
// ==============================

async function checkAuthentication() {
  const token = localStorage.getItem("token");

  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const result = await getCurrentStudent();

    if (!result.data) {
      throw new Error(
        "ไม่พบข้อมูลนักศึกษา"
      );
    }

    const student = result.data;

    // ตรวจว่าเป็นนักศึกษาสหกิจ
    if (student.track !== "co_op") {
      console.warn(
        "This account is not cooperative education."
      );

      clearAuthentication();

      window.location.href =
        "/login.html";

      return;
    }

    localStorage.setItem(
      "student",
      JSON.stringify(student)
    );

    // แสดงข้อมูลจาก students
    renderStudent(student);

    // โหลดข้อมูลเพิ่มเติมจาก student_profiles
    const studentProfile = await loadStudentProfile();
    await loadTeachers(studentProfile?.advisor_teacher_id);
    await loadStudentCoopProjectSections();
  } catch (error) {
    console.error(
      "AUTH CHECK ERROR:",
      error
    );

    clearAuthentication();

    redirectToLogin();
  }
}

// ==============================
// Load Student Profile
// ==============================

async function loadStudentProfile() {
  setProfileLoading(true);
  showMessage(profileLoadMessage, "กำลังโหลดข้อมูลประวัตินักศึกษา...", "loading");

  try {
    const result = await getMyStudentProfile();

    if (!result.student) {
      throw new Error(
        "ไม่พบข้อมูลประวัตินักศึกษา"
      );
    }

    // แสดงข้อมูลพื้นฐานจาก students อีกครั้ง
    renderStudent(result.student);

    currentStudent = result.student;
    syncCoopPrerequisiteProgram();
    populateStudentInfoForm(result.student);
    await loadProfileImage(Boolean(result.student.profile_image));

    // เก็บข้อมูล student_profiles ปัจจุบัน
    currentStudentProfile =
      result.student.profile || null;

    // Re-render once the profile is available so its prefix is included in the name.
    renderStudent(currentStudent);

    // แสดงข้อมูลจาก student_profiles
    renderStudentProfile(
      currentStudentProfile
    );

    if (currentStudentProfile) {
      clearMessage(profileLoadMessage);
    } else {
      showMessage(profileLoadMessage, "ยังไม่มีรายละเอียดประวัติเพิ่มเติม", "info");
    }

    return result.student;
  } catch (error) {
    console.error(
      "LOAD STUDENT PROFILE ERROR:",
      error
    );

    currentStudentProfile = null;

    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return null;
    }

    showMessage(
      profileLoadMessage,
      error.message || "ไม่สามารถโหลดข้อมูลประวัตินักศึกษาได้",
      "error"
    );

    return null;
  } finally {
    setProfileLoading(false);
  }
}

function setProfileLoading(isLoading) {
  profilePanel?.classList.toggle("is-loading", isLoading);
  profilePanel?.classList.toggle("is-ready", !isLoading);
  profilePanel?.setAttribute("aria-busy", String(isLoading));
}

// ==============================
// Render Student
// ==============================

function formatTeacherName(teacher) {
  if (!teacher) {
    return "-";
  }

  return [teacher.academic_title, teacher.first_name, teacher.last_name]
    .filter(Boolean)
    .join(" ") || "-";
}

function getStudentCode(student) {
  // The student code is authoritative only when read from students.student_id.
  // Email may legitimately begin with "s" and must never be used as a fallback.
  return String(student?.student_id || "").trim() || "-";
}

function populateStudentInfoForm(student) {
  if (!student) {
    return;
  }

  const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();
  setInputElementValue(studentFullNameInput, fullName);
  setInputElementValue(studentIdInput, getStudentCode(student));
  setInputElementValue(studentEmailInput, student.email);

  const major = student.major || "";
  if (
    studentMajorInput &&
    major &&
    !Array.from(studentMajorInput.options).some((option) => option.value === major)
  ) {
    const option = document.createElement("option");
    option.value = major;
    option.textContent = major;
    studentMajorInput.appendChild(option);
  }

  setInputElementValue(studentMajorInput, major);
  setInputElementValue(studentYearLevelInput, student.year_level ?? "");
  setInputElementValue(studentGpaInput, student.gpa ?? "");
  setInputElementValue(
    studentCoopAdvisorInput,
    student.coopAdvisorTeacher
      ? formatTeacherName(student.coopAdvisorTeacher)
      : "ยังไม่ได้กำหนด"
  );

  if (studentAdvisorInput) {
    preserveCurrentAdvisorOption(student.advisor_teacher_id);
    studentAdvisorInput.value = student.advisor_teacher_id || "";
    hasAdvisorSelectionChanged = false;
  }
}

function setInputElementValue(element, value) {
  if (element) {
    element.value = value ?? "";
  }
}

function preserveCurrentAdvisorOption(advisorId) {
  if (!advisorId || Array.from(studentAdvisorInput.options).some((option) => option.value === advisorId)) {
    return;
  }

  const option = document.createElement("option");
  option.value = advisorId;
  option.textContent = currentStudent?.advisorTeacher?.id === advisorId
    ? formatTeacherName(currentStudent.advisorTeacher)
    : "อาจารย์ที่ปรึกษาปัจจุบัน";
  option.disabled = true;
  studentAdvisorInput.appendChild(option);
}

async function loadTeachers(selectedTeacherId = currentStudent?.advisor_teacher_id) {
  if (!studentAdvisorInput) {
    return;
  }

  isTeacherDirectoryLoaded = false;
  hasAdvisorSelectionChanged = false;
  studentAdvisorInput.disabled = true;
  studentAdvisorInput.setAttribute("aria-busy", "true");
  studentAdvisorInput.replaceChildren();
  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "กำลังโหลดรายชื่ออาจารย์...";
  studentAdvisorInput.appendChild(loadingOption);
  preserveCurrentAdvisorOption(selectedTeacherId);
  studentAdvisorInput.value = selectedTeacherId || "";

  try {
    const result = await getTeachers();
    if (!Array.isArray(result?.teachers)) {
      throw new Error("ไม่สามารถโหลดรายชื่ออาจารย์ได้");
    }

    studentAdvisorInput.replaceChildren();
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "ยังไม่ได้กำหนด";
    studentAdvisorInput.appendChild(emptyOption);

    const teachers = result.teachers;
    teachers.forEach((teacher) => {
      const option = document.createElement("option");
      option.value = teacher.id;
      option.textContent = formatTeacherName(teacher);
      studentAdvisorInput.appendChild(option);
    });

    if (teachers.length === 0) {
      const noTeacherOption = document.createElement("option");
      noTeacherOption.value = "";
      noTeacherOption.textContent = "ไม่พบรายชื่ออาจารย์";
      noTeacherOption.disabled = true;
      studentAdvisorInput.appendChild(noTeacherOption);
    }

    preserveCurrentAdvisorOption(selectedTeacherId);
    studentAdvisorInput.value = selectedTeacherId || "";
    isTeacherDirectoryLoaded = true;
  } catch (error) {
    console.error("LOAD TEACHERS ERROR:", error);
    loadingOption.textContent = "ไม่สามารถโหลดรายชื่ออาจารย์ได้";

    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }

    showMessage(studentInfoMessage, error.message || "ไม่สามารถโหลดรายชื่ออาจารย์ได้", "error");
  } finally {
    studentAdvisorInput.disabled = !isTeacherDirectoryLoaded;
    studentAdvisorInput.setAttribute("aria-busy", "false");
  }
}

studentAdvisorInput?.addEventListener("change", () => {
  if (isTeacherDirectoryLoaded) {
    hasAdvisorSelectionChanged = (studentAdvisorInput.value || null) !== (currentStudent?.advisor_teacher_id || null);
  }
});

function clearProfileImageObjectUrl() {
  if (profileImageObjectUrl) {
    URL.revokeObjectURL(profileImageObjectUrl);
    profileImageObjectUrl = null;
  }
}

function resetProfileImagePreview() {
  clearProfileImageObjectUrl();
  if (profileAvatarImage) {
    profileAvatarImage.removeAttribute("src");
    profileAvatarImage.hidden = true;
  }
  if (profileAvatarPlaceholder) {
    profileAvatarPlaceholder.hidden = false;
    profileAvatarPlaceholder.style.display = "flex";
  }
  if (modalProfileImage) {
    modalProfileImage.removeAttribute("src");
    modalProfileImage.hidden = true;
  }
  if (modalProfileImagePlaceholder) {
    modalProfileImagePlaceholder.hidden = false;
  }
}

function showProfileImagePreview(objectUrl) {
  clearProfileImageObjectUrl();
  profileImageObjectUrl = objectUrl;
  if (profileAvatarImage) {
    profileAvatarImage.src = objectUrl;
    profileAvatarImage.hidden = false;
  }
  if (profileAvatarPlaceholder) {
    profileAvatarPlaceholder.hidden = true;
    profileAvatarPlaceholder.style.display = "none";
  }
  if (modalProfileImage) {
    modalProfileImage.src = objectUrl;
    modalProfileImage.hidden = false;
  }
  if (modalProfileImagePlaceholder) {
    modalProfileImagePlaceholder.hidden = true;
  }
}

async function loadProfileImage(hasProfileImage) {
  if (!hasProfileImage) {
    resetProfileImagePreview();
    return;
  }

  try {
    const image = await getStudentProfileImage();
    showProfileImagePreview(URL.createObjectURL(image));
  } catch (error) {
    console.error("LOAD PROFILE IMAGE ERROR:", error);

    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }

    resetProfileImagePreview();
  }
}

function setStudentInfoButtonState(button, isLoading, loadingLabel, defaultLabel) {
  if (!button) {
    return;
  }

  button.disabled = isLoading;
  button.innerHTML = isLoading
    ? `<i class="fa-solid fa-spinner fa-spin"></i>${loadingLabel}`
    : defaultLabel;
}

async function uploadSelectedProfileImage() {
  if (isProfileImageUploading || isStudentProfileSaving) {
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    redirectToLogin();
    return;
  }

  if (!selectedProfileImageFile) {
    showMessage(profileImageMessage, "กรุณาเลือกรูปโปรไฟล์", "error");
    return;
  }

  const formData = new FormData();
  formData.append("profile_image", selectedProfileImageFile);
  isProfileImageUploading = true;
  clearMessage(profileImageMessage);
  profileImageInput.disabled = true;
  setStudentInfoButtonState(
    uploadProfileImageBtn,
    true,
    "กำลังอัปโหลด...",
    '<i class="fa-solid fa-cloud-arrow-up"></i>อัปโหลดรูป'
  );

  try {
    const result = await uploadStudentProfileImage(formData);

    selectedProfileImageFile = null;
    if (profileImageInput) {
      profileImageInput.value = "";
    }
    currentStudent = {
      ...(currentStudent || {}),
      profile_image: result.profile_image || true,
    };
    await loadProfileImage(true);
    showMessage(profileImageMessage, "อัปโหลดรูปโปรไฟล์สำเร็จ", "success");
    showToast("อัปโหลดรูปโปรไฟล์สำเร็จ", "success");
  } catch (error) {
    console.error("UPLOAD PROFILE IMAGE ERROR:", error);

    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }

    showMessage(profileImageMessage, error.message || "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้", "error");
  } finally {
    isProfileImageUploading = false;
    profileImageInput.disabled = false;
    setStudentInfoButtonState(
      uploadProfileImageBtn,
      false,
      "",
      '<i class="fa-solid fa-cloud-arrow-up"></i>อัปโหลดรูป'
    );
  }
}

async function saveStudentInfo(event) {
  event.preventDefault();
  if (isStudentInfoSaving) {
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    redirectToLogin();
    return;
  }

  const major = studentMajorInput?.value.trim() || "";
  const yearLevel = Number(studentYearLevelInput?.value);
  const gpaValue = studentGpaInput?.value.trim() || "";
  const gpa = Number(gpaValue);

  clearMessage(studentInfoMessage);
  if (!major || !Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 4) {
    showMessage(studentInfoMessage, "กรุณากรอกสาขาและชั้นปีให้ถูกต้อง", "error");
    return;
  }
  if (!gpaValue || !Number.isFinite(gpa) || gpa < 0 || gpa > 4) {
    showMessage(studentInfoMessage, "GPA ต้องอยู่ระหว่าง 0.00 ถึง 4.00", "error");
    return;
  }

  const payload = {
    major,
    year_level: yearLevel,
    gpa,
  };
  // Omitted fields are preserved by the backend; only user changes update the advisor.
  if (isTeacherDirectoryLoaded && hasAdvisorSelectionChanged) {
    payload.advisor_teacher_id = studentAdvisorInput.value || null;
  }

  const defaultButtonLabel = '<i class="fa-solid fa-floppy-disk"></i>บันทึกข้อมูลนักศึกษา';
  const saveStudentInfoBtn = document.getElementById("saveStudentInfoBtn");
  isStudentInfoSaving = true;
  setStudentInfoButtonState(saveStudentInfoBtn, true, "กำลังบันทึก...", defaultButtonLabel);

  try {
    await updateStudentInfo(payload);

    const student = await loadStudentProfile();
    await loadTeachers(student?.advisor_teacher_id);
    showMessage(studentInfoMessage, "บันทึกข้อมูลนักศึกษาสำเร็จ", "success");
    showToast("บันทึกข้อมูลนักศึกษาสำเร็จ", "success");
  } catch (error) {
    console.error("SAVE STUDENT INFO ERROR:", error);

    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }

    showMessage(studentInfoMessage, error.message || "ไม่สามารถบันทึกข้อมูลนักศึกษาได้", "error");
  } finally {
    isStudentInfoSaving = false;
    setStudentInfoButtonState(saveStudentInfoBtn, false, "", defaultButtonLabel);
  }
}

profileImageInput?.addEventListener("change", () => {
  const file = profileImageInput.files?.[0];
  clearMessage(profileImageMessage);

  if (!file) {
    selectedProfileImageFile = null;
    uploadProfileImageBtn.disabled = true;
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    profileImageInput.value = "";
    selectedProfileImageFile = null;
    uploadProfileImageBtn.disabled = true;
    showMessage(profileImageMessage, "รองรับเฉพาะ JPG, PNG และ WEBP", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    profileImageInput.value = "";
    selectedProfileImageFile = null;
    uploadProfileImageBtn.disabled = true;
    showMessage(profileImageMessage, "ขนาดรูปต้องไม่เกิน 5 MB", "error");
    return;
  }

  selectedProfileImageFile = file;
  showProfileImagePreview(URL.createObjectURL(file));
  uploadProfileImageBtn.disabled = false;
});

document.getElementById("editBirthDate")?.addEventListener("change", () => {
  setInputValue("editAge", calculateAge(getInputValue("editBirthDate")));
});

uploadProfileImageBtn?.addEventListener("click", uploadSelectedProfileImage);
studentInfoForm?.addEventListener("submit", saveStudentInfo);
window.addEventListener("beforeunload", clearProfileImageObjectUrl);

function renderStudent(student) {
  currentStudent = student;
  renderJobMatchingSource();
  const firstName =
    student.first_name || "";

  const lastName =
    student.last_name || "";

  const prefix = String(currentStudentProfile?.prefix || "").trim();
  const fullName = [prefix, firstName, lastName].filter(Boolean).join(" ") || "-";

  const studentId = getStudentCode(student);

  const email =
    student.email || "-";

  const major =
    student.major || "-";

  const year =
    student.year_level || "-";

  const gpa =
    student.gpa ?? "-";

  const status =
    translateStatus(student.status);

  // Navbar
  if (userNameDisplay) {
    userNameDisplay.textContent =
      fullName;
  }

  // Welcome
  if (overviewGreeting) {
    overviewGreeting.textContent =
      `ยินดีต้อนรับ ${fullName}`;
  }

  // Profile main
  setText(
    profileFullName,
    fullName
  );

  setText(
    profileStudentId,
    studentId
  );

  setText(
    profileEmail,
    email
  );

  // Profile details
  setText(
    profileFirstName,
    firstName || "-"
  );

  setText(
    profileLastName,
    lastName || "-"
  );

  setText(
    profileStudentIdDetail,
    studentId
  );

  setText(
    profileEmailDetail,
    email
  );

  setText(
    profileMajor,
    major
  );

  setText(
    profileYear,
    year
  );

  setText(
    profileGpa,
    gpa
  );

  setText(
    profileTrack,
    "สหกิจศึกษา"
  );

  setText(
    studentStatus,
    status
  );
}

// ==============================
// Render Student Profile
// ==============================

function renderStudentProfile(profile) {
  renderJobMatchingSource();
  if (!profile) {
    console.log(
      "Student profile is empty."
    );

    return;
  }

  setText(profilePrefix, profile.prefix || "-");

  setText(
    profileBirthDate,
    formatProfileDate(
      profile.birth_date
    )
  );

  setText(
    profileAge,
    calculateAge(
      profile.birth_date
    )
  );

  setText(
    profileHeight,
    profile.height_cm
      ? `${profile.height_cm} ซม.`
      : "-"
  );

  setText(
    profileWeight,
    profile.weight_kg
      ? `${profile.weight_kg} กก.`
      : "-"
  );

  setText(
    profileNationality,
    profile.nationality || "-"
  );

  setText(
    profileEthnicity,
    profile.ethnicity || "-"
  );

  setText(
    profileReligion,
    profile.religion || "-"
  );

  setText(
    profileBloodType,
    profile.blood_type || "-"
  );

  setText(
    profileMedicalConditions,
    profile.medical_conditions || "-"
  );

  setText(
    profileAllergies,
    profile.allergies || "-"
  );

  setText(
    profileSpecialAbilities,
    profile.special_abilities || "-"
  );

  setText(
    profileRelatedSkills,
    profile.related_skills || "-"
  );

  // ที่อยู่
  setText(
    profileHometownAddress,
    profile.hometown_address || "-"
  );

  setText(
    profileHometownPhone,
    profile.hometown_phone || "-"
  );

  setText(
    profileCurrentAddress,
    profile.current_address || "-"
  );

  setText(
    profileCurrentPhone,
    profile.current_phone || "-"
  );

  // บิดา
  setText(
    profileFatherName,
    profile.father_name || "-"
  );

  setText(
    profileFatherAge,
    profile.father_age
      ? `${profile.father_age} ปี`
      : "-"
  );

  setText(
    profileFatherOccupation,
    profile.father_occupation || "-"
  );

  // มารดา
  setText(
    profileMotherName,
    profile.mother_name || "-"
  );

  setText(
    profileMotherAge,
    profile.mother_age
      ? `${profile.mother_age} ปี`
      : "-"
  );

  setText(
    profileMotherOccupation,
    profile.mother_occupation || "-"
  );

  // ผู้ปกครอง
  setText(
    profileParentAddress,
    profile.parent_contact_address || "-"
  );

  setText(
    profileParentPhone,
    profile.parent_phone || "-"
  );

  // ผู้ติดต่อฉุกเฉิน
  setText(
    profileEmergencyName,
    profile.emergency_contact_name || "-"
  );

  setText(
    profileEmergencyRelation,
    profile.emergency_contact_relation || "-"
  );

  setText(
    profileEmergencyAddress,
    profile.emergency_contact_address || "-"
  );

  setText(
    profileEmergencyPhone,
    profile.emergency_contact_phone || "-"
  );
}

// ==============================
// Profile Helper
// ==============================

function formatProfileDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date =
    new Date(
      `${dateValue}T00:00:00`
    );

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

function calculateAge(birthDate) {
  if (!birthDate) {
    return "-";
  }

  const birth =
    new Date(
      `${birthDate}T00:00:00`
    );

  if (Number.isNaN(birth.getTime())) {
    return "-";
  }

  const today =
    new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() <
        birth.getDate()
    )
  ) {
    age--;
  }

  return `${age} ปี`;
}

function setText(
  element,
  value
) {
  if (element) {
    element.textContent =
      value ?? "-";
  }
}

// ==============================
// Edit Student Profile Modal
// ==============================

function openProfileEditModal() {
  if (isStudentProfileSaving || isProfileImageUploading) {
    return;
  }

  fillProfileEditForm(
    currentStudentProfile
  );

  clearMessage(
    profileEditMessage
  );

  profileEditModal?.classList.add(
    "open"
  );

  profileEditModal?.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}

function closeProfileModal() {
  if (isStudentProfileSaving) {
    return;
  }

  profileEditModal?.classList.remove(
    "open"
  );

  profileEditModal?.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";
}

function openProfileImageEditor() {
  openProfileEditModal();

  window.setTimeout(() => {
    profileImageEditorSection?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 0);
}

function fillProfileEditForm(profile) {
  const data = profile || {};

  setInputValue(
    "editPrefix",
    data.prefix
  );

  setInputValue(
    "editBirthDate",
    data.birth_date
  );

  setInputValue(
    "editAge",
    data.birth_date ? calculateAge(data.birth_date) : ""
  );

  setInputValue(
    "editHeight",
    data.height_cm
  );

  setInputValue(
    "editWeight",
    data.weight_kg
  );

  setInputValue(
    "editNationality",
    data.nationality
  );

  setInputValue(
    "editEthnicity",
    data.ethnicity
  );

  setInputValue(
    "editReligion",
    data.religion
  );

  setInputValue(
    "editBloodType",
    data.blood_type
  );

  setInputValue(
    "editMedicalConditions",
    data.medical_conditions
  );

  setInputValue(
    "editAllergies",
    data.allergies
  );

  setInputValue(
    "editSpecialAbilities",
    data.special_abilities
  );

  setInputValue(
    "editRelatedSkills",
    data.related_skills
  );

  // ที่อยู่
  setInputValue(
    "editHometownAddress",
    data.hometown_address
  );

  setInputValue(
    "editHometownPhone",
    data.hometown_phone
  );

  setInputValue(
    "editCurrentAddress",
    data.current_address
  );

  setInputValue(
    "editCurrentPhone",
    data.current_phone
  );

  // บิดา
  setInputValue(
    "editFatherName",
    data.father_name
  );

  setInputValue(
    "editFatherAge",
    data.father_age
  );

  setInputValue(
    "editFatherOccupation",
    data.father_occupation
  );

  // มารดา
  setInputValue(
    "editMotherName",
    data.mother_name
  );

  setInputValue(
    "editMotherAge",
    data.mother_age
  );

  setInputValue(
    "editMotherOccupation",
    data.mother_occupation
  );

  // ผู้ปกครอง
  setInputValue(
    "editParentAddress",
    data.parent_contact_address
  );

  setInputValue(
    "editParentPhone",
    data.parent_phone
  );

  // ผู้ติดต่อฉุกเฉิน
  setInputValue(
    "editEmergencyName",
    data.emergency_contact_name
  );

  setInputValue(
    "editEmergencyRelation",
    data.emergency_contact_relation
  );

  setInputValue(
    "editEmergencyAddress",
    data.emergency_contact_address
  );

  setInputValue(
    "editEmergencyPhone",
    data.emergency_contact_phone
  );
}

function setInputValue(
  id,
  value
) {
  const element =
    document.getElementById(id);

  if (!element) {
    return;
  }

  element.value =
    value ?? "";
}

function getInputValue(id) {
  const element =
    document.getElementById(id);

  if (!element) {
    return "";
  }

  return element.value.trim();
}

function getNullableText(id) {
  const value =
    getInputValue(id);

  return value === ""
    ? null
    : value;
}

function getNumberValue(id) {
  const value =
    getInputValue(id);

  if (value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number)
    ? null
    : number;
}

async function saveStudentProfile() {
  if (isStudentProfileSaving || isProfileImageUploading) {
    return;
  }

  const token =
    localStorage.getItem("token");

  if (!token) {
    redirectToLogin();
    return;
  }

  clearMessage(
    profileEditMessage
  );

  const payload = {
    prefix:
      getNullableText(
        "editPrefix"
      ),

    birth_date:
      getNullableText(
        "editBirthDate"
      ),

    height_cm:
      getNumberValue(
        "editHeight"
      ),

    weight_kg:
      getNumberValue(
        "editWeight"
      ),

    nationality:
      getNullableText(
        "editNationality"
      ),

    ethnicity:
      getNullableText(
        "editEthnicity"
      ),

    religion:
      getNullableText(
        "editReligion"
      ),

    blood_type:
      getNullableText(
        "editBloodType"
      ),

    medical_conditions:
      getNullableText(
        "editMedicalConditions"
      ),

    allergies:
      getNullableText(
        "editAllergies"
      ),

    special_abilities:
      getNullableText(
        "editSpecialAbilities"
      ),

    related_skills:
      getNullableText(
        "editRelatedSkills"
      ),

    hometown_address:
      getNullableText(
        "editHometownAddress"
      ),

    hometown_phone:
      getNullableText(
        "editHometownPhone"
      ),

    current_address:
      getNullableText(
        "editCurrentAddress"
      ),

    current_phone:
      getNullableText(
        "editCurrentPhone"
      ),

    father_name:
      getNullableText(
        "editFatherName"
      ),

    father_age:
      getNumberValue(
        "editFatherAge"
      ),

    father_occupation:
      getNullableText(
        "editFatherOccupation"
      ),

    mother_name:
      getNullableText(
        "editMotherName"
      ),

    mother_age:
      getNumberValue(
        "editMotherAge"
      ),

    mother_occupation:
      getNullableText(
        "editMotherOccupation"
      ),

    parent_contact_address:
      getNullableText(
        "editParentAddress"
      ),

    parent_phone:
      getNullableText(
        "editParentPhone"
      ),

    emergency_contact_name:
      getNullableText(
        "editEmergencyName"
      ),

    emergency_contact_relation:
      getNullableText(
        "editEmergencyRelation"
      ),

    emergency_contact_address:
      getNullableText(
        "editEmergencyAddress"
      ),

    emergency_contact_phone:
      getNullableText(
        "editEmergencyPhone"
      ),
  };

  isStudentProfileSaving = true;

  try {
    if (saveProfileBtn) {
      saveProfileBtn.disabled = true;

      saveProfileBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        กำลังบันทึก...
      `;
    }

    await updateMyStudentProfile(payload);

    // โหลดข้อมูลจริงจาก Database ใหม่
    await loadStudentProfile();

    showMessage(
      profileEditMessage,
      "บันทึกข้อมูลเรียบร้อยแล้ว",
      "success"
    );

    showToast("บันทึกข้อมูลประวัติเรียบร้อยแล้ว", "success");

    setTimeout(
      () => {
        closeProfileModal();
      },
      500
    );
  } catch (error) {
    console.error(
      "SAVE STUDENT PROFILE ERROR:",
      error
    );

    showMessage(
      profileEditMessage,
      error.message ||
        "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      "error"
    );
  } finally {
    isStudentProfileSaving = false;
    if (saveProfileBtn) {
      saveProfileBtn.disabled = false;

      saveProfileBtn.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        บันทึกข้อมูล
      `;
    }
  }
}

btnEditProfile?.addEventListener(
  "click",
  openProfileEditModal
);

profileAvatarButton?.addEventListener("click", openProfileImageEditor);

profileAvatarButton?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openProfileImageEditor();
  }
});

closeProfileEditModal?.addEventListener(
  "click",
  closeProfileModal
);

cancelProfileEditBtn?.addEventListener(
  "click",
  closeProfileModal
);

saveProfileBtn?.addEventListener(
  "click",
  saveStudentProfile
);

profileEditModal?.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      profileEditModal
    ) {
      closeProfileModal();
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      profileEditModal?.classList.contains(
        "open"
      )
    ) {
      closeProfileModal();
    }
  }
);

// ==============================
// Translate Status
// ==============================

function translateStatus(status) {
  const statusMap = {
    pending:
      "รอดำเนินการ",

    searching:
      "กำลังค้นหาสถานประกอบการ",

    placed:
      "ได้สถานประกอบการแล้ว",

    in_progress:
      "กำลังปฏิบัติงานสหกิจศึกษา",

    completed:
      "เสร็จสิ้นสหกิจศึกษา",
  };

  return (
    statusMap[status] ||
    status ||
    "-"
  );
}

// ==============================
// Logout
// ==============================

function logout() {
  clearAuthentication();

  window.location.href =
    "/login.html";
}

function clearAuthentication() {
  localStorage.removeItem("token");

  localStorage.removeItem("student");
}

function redirectToLogin() {
  window.location.href =
    "/login.html";
}

logoutBtn?.addEventListener(
  "click",
  logout
);

// ==============================
// Sidebar
// ==============================

const sidebarItems =
  document.querySelectorAll(
    ".sidebar-item[data-target]"
  );

const contentPanels =
  document.querySelectorAll(
    ".content-panel"
  );

function activateDashboardPanel(targetId) {
  sidebarItems.forEach((item) => item.classList.toggle("active", item.dataset.target === targetId));
  contentPanels.forEach((panel) => panel.classList.toggle("active", panel.id === targetId));
  if (targetId === "panel-mentor") loadMentor();
  if (targetId === "panel-evaluate") return companyEvaluation.load();
  if (targetId === "panel-request") return loadCoopRequests();
  if (targetId === "panel-job-matching") renderJobMatchingSource();
  window.scrollTo({ top: 0, behavior: "smooth" });
  return Promise.resolve(true);
}

sidebarItems.forEach(
  (item) => {
    item.addEventListener(
      "click",
      () => {
        const targetId =
          item.dataset.target;

        if (!targetId) {
          return;
        }

        activateDashboardPanel(targetId);
      }
    );
  }
);

// ==============================
// Job Matching
// ==============================

const jobMatchingSkillsBtn = document.getElementById("jobMatchingSkillsBtn");
const jobMatchingResumeBtn = document.getElementById("jobMatchingResumeBtn");
const jobMatchingMessage = document.getElementById("jobMatchingMessage");
const jobMatchingLoading = document.getElementById("jobMatchingLoading");
const jobMatchingLoadingTitle = document.getElementById("jobMatchingLoadingTitle");
const jobMatchingLoadingCaption = document.getElementById("jobMatchingLoadingCaption");
const jobMatchingProgressValue = document.getElementById("jobMatchingProgressValue");
const jobMatchingProgressTrack = document.getElementById("jobMatchingProgressTrack");
const jobMatchingProgressFill = document.getElementById("jobMatchingProgressFill");
const jobMatchingProgressNote = document.getElementById("jobMatchingProgressNote");
const jobMatchingResults = document.getElementById("jobMatchingResults");
const jobMatchingEmpty = document.getElementById("jobMatchingEmpty");
const jobMatchingResultSource = document.getElementById("jobMatchingResultSource");
let isJobMatchingLoading = false;
let lastMatchingSource = null;
let jobMatchingProgressTimer = null;
let jobMatchingProgressTimeout = null;
let jobMatchingProgress = 0;
let jobMatchingProgressStartedAt = 0;

function updateJobMatchingProgress(value) {
  jobMatchingProgress = value;
  jobMatchingProgressValue.textContent = `${value}%`;
  jobMatchingProgressTrack.setAttribute("aria-valuenow", String(value));
  jobMatchingProgressFill.style.width = `${value}%`;
}

function stopJobMatchingProgress() {
  if (jobMatchingProgressTimer !== null) {
    window.clearInterval(jobMatchingProgressTimer);
    jobMatchingProgressTimer = null;
  }
  if (jobMatchingProgressTimeout !== null) {
    window.clearTimeout(jobMatchingProgressTimeout);
    jobMatchingProgressTimeout = null;
  }
}

function startJobMatchingProgress() {
  stopJobMatchingProgress();
  jobMatchingProgressNote.textContent = "เปอร์เซ็นต์แสดงการรอการตอบกลับ ไม่ใช่ความคืบหน้าการวิเคราะห์จริง";
  updateJobMatchingProgress(0);
  jobMatchingProgressStartedAt = Date.now();
  jobMatchingProgressTimer = window.setInterval(() => {
    const elapsed = Math.min(Date.now() - jobMatchingProgressStartedAt, 5000);
    const ratio = elapsed / 5000;
    // Ease out: move quickly at first, then slow toward the 95% ceiling.
    updateJobMatchingProgress(Math.min(95, Math.round(95 * (1 - (1 - ratio) ** 2))));
    if (elapsed >= 5000) {
      window.clearInterval(jobMatchingProgressTimer);
      jobMatchingProgressTimer = null;
    }
  }, 50);
}

function waitForJobMatchingProgressMinimum() {
  const remaining = Math.max(0, 5000 - (Date.now() - jobMatchingProgressStartedAt));
  if (remaining === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    jobMatchingProgressTimeout = window.setTimeout(() => {
      jobMatchingProgressTimeout = null;
      resolve();
    }, remaining);
  });
}

function completeJobMatchingProgress(sourceLabel) {
  stopJobMatchingProgress();
  return new Promise((resolve) => {
    const start = Date.now();
    jobMatchingProgressTimer = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - start) / 250);
      updateJobMatchingProgress(Math.min(100, Math.round(95 + 5 * ratio)));
      if (ratio >= 1) {
        stopJobMatchingProgress();
        jobMatchingProgressNote.textContent = `วิเคราะห์จาก${sourceLabel}เสร็จแล้ว`;
        jobMatchingProgressTimeout = window.setTimeout(() => {
          jobMatchingProgressTimeout = null;
          resolve();
        }, 400);
      }
    }, 16);
  });
}

function renderJobMatchingSource() {
  setText(document.getElementById("jobMatchingMajor"), currentStudent?.major?.trim() || "ยังไม่ได้ระบุ");
  setText(document.getElementById("jobMatchingSkills"), currentStudentProfile?.related_skills?.trim() || "ยังไม่ได้ระบุ");
}

function createJobMatchingElement(tag, value, className = "") {
  const element = document.createElement(tag);
  element.textContent = value;
  element.className = className;
  return element;
}

function renderJobMatches(matches) {
  const cards = matches.map((match) => {
    const card = document.createElement("article");
    card.className = "job-matching-card";
    if (match.rank === 1) {
      card.classList.add("is-top-ranked");
    }

    const header = document.createElement("div");
    header.className = "job-matching-card-header";
    const identity = document.createElement("div");
    identity.className = "job-matching-identity";
    const rank = createJobMatchingElement("span", `#${match.rank}`, "job-matching-rank");
    rank.setAttribute("aria-label", `อันดับ ${match.rank}`);
    identity.append(rank);

    const titleGroup = document.createElement("div");
    titleGroup.className = "job-matching-title-group";
    titleGroup.append(
      createJobMatchingElement("h4", match.title || "ไม่ระบุชื่อตำแหน่ง", "job-matching-title"),
      createJobMatchingElement("p", match.company?.name || "ไม่ระบุชื่อสถานประกอบการ", "job-matching-company"),
    );
    identity.append(titleGroup);
    if (match.rank === 1) {
      identity.append(createJobMatchingElement("span", "แนะนำสูงสุด", "job-matching-top-label"));
    }

    const score = document.createElement("div");
    score.className = "job-matching-score";
    score.setAttribute("aria-label", `ความเหมาะสม ${(match.score * 100).toFixed(2)}%`);
    score.append(
      createJobMatchingElement("span", "ความเหมาะสม", "job-matching-score-label"),
      createJobMatchingElement("strong", `${(match.score * 100).toFixed(2)}%`, "job-matching-score-value"),
    );
    header.append(identity, score);
    card.append(header);

    const metadata = document.createElement("div");
    metadata.className = "job-matching-metadata";
    const appendMetadata = (iconName, value, className = "") => {
      if (value == null || value === "") return;
      const item = document.createElement("span");
      item.className = `job-matching-meta-item ${className}`.trim();
      const icon = document.createElement("i");
      icon.className = `fa-solid ${iconName}`;
      icon.setAttribute("aria-hidden", "true");
      item.append(icon, createJobMatchingElement("span", value));
      metadata.append(item);
    };
    appendMetadata("fa-location-dot", match.company?.province || "ยังไม่ได้ระบุ");
    const labels = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };
    (match.workModes || []).forEach(({ mode }) => {
      if (mode) {
        appendMetadata("fa-building", labels[mode] || mode);
      }
    });
    appendMetadata("fa-users", match.quota == null || match.quota === "" ? "" : `รับ ${match.quota} คน`);
    appendMetadata("fa-baht-sign", match.compensation_text);
    appendMetadata("fa-calendar-days", match.work_days_per_week == null || match.work_days_per_week === "" ? "" : `${match.work_days_per_week} วัน/สัปดาห์`);
    if (metadata.childElementCount) card.append(metadata);

    if (match.description) {
      card.append(createJobMatchingElement("p", match.description, "job-matching-description"));
    }
    if (match.category) {
      const categoryLabels = {
        information_technology: "Information Technology",
      };
      const category = createJobMatchingElement("span", categoryLabels[match.category] || match.category, "job-matching-category");
      card.append(category);
    }
    const coopRequestButton = document.createElement("button");
    coopRequestButton.type = "button";
    coopRequestButton.className = "btn-primary job-matching-coop-request";
    coopRequestButton.dataset.jobPostingId = match.job_posting_id;
    coopRequestButton.textContent = "เขียนคำร้องสหกิจสำหรับตำแหน่งนี้";
    card.append(coopRequestButton);
    return card;
  });
  jobMatchingResults.replaceChildren(...cards);
}

const JOB_MATCHING_ERRORS = {
  400: "เลือกแหล่งข้อมูลสำหรับวิเคราะห์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
  403: "บัญชีนี้ไม่มีสิทธิ์ใช้งานการแนะนำตำแหน่งงาน",
  404: "ไม่พบข้อมูลนักศึกษา",
  422: "ยังไม่มีข้อมูลเพียงพอสำหรับการจับคู่ กรุณาระบุสาขาและทักษะที่เกี่ยวข้องในประวัตินักศึกษา",
  502: "ระบบได้รับผลการวิเคราะห์ที่ไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง",
  503: "ระบบวิเคราะห์ตำแหน่งงานไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง",
  504: "การวิเคราะห์ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง",
};

const JOB_MATCHING_SOURCE_LABELS = {
  skills: "ทักษะและสาขา",
  resume: "Resume",
};

const JOB_MATCHING_CODE_ERRORS = {
  MATCH_PROFILE_TEXT_REQUIRED: "กรุณาระบุสาขาหรือทักษะที่เกี่ยวข้องก่อนวิเคราะห์จากทักษะ",
  MATCH_RESUME_TEXT_REQUIRED: "กรุณาอัปโหลด Resume ที่ระบบสามารถอ่านข้อความได้ก่อนวิเคราะห์จาก Resume",
  MATCH_SOURCE_INVALID: "เลือกแหล่งข้อมูลสำหรับวิเคราะห์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
};

async function loadJobMatches(source) {
  if (isJobMatchingLoading) {
    return;
  }
  isJobMatchingLoading = true;
  lastMatchingSource = null;
  jobMatchingResults.replaceChildren();
  jobMatchingResultSource.hidden = true;
  jobMatchingResultSource.textContent = "";
  jobMatchingResults.classList.remove("job-matching-content-in");
  jobMatchingEmpty.classList.remove("job-matching-content-in");
  jobMatchingMessage.classList.remove("job-matching-content-in");
  jobMatchingLoading.hidden = false;
  startJobMatchingProgress();
  const sourceLabel = JOB_MATCHING_SOURCE_LABELS[source];
  const loadingText = source === "resume"
    ? "กำลังวิเคราะห์จาก Resume..."
    : "กำลังวิเคราะห์จากทักษะ...";
  jobMatchingLoadingTitle.textContent = loadingText;
  jobMatchingLoadingCaption.textContent = source === "resume"
    ? "กำลังใช้ข้อความที่อ่านได้จาก Resume เพื่อจับคู่ตำแหน่งงาน"
    : "กำลังใช้สาขาและทักษะที่เกี่ยวข้องในประวัตินักศึกษา";
  jobMatchingEmpty.hidden = true;
  jobMatchingResults.setAttribute("aria-busy", "true");
  setButtonLoading(jobMatchingSkillsBtn, true, source === "skills" ? "กำลังวิเคราะห์ทักษะ..." : "วิเคราะห์จากทักษะ");
  setButtonLoading(jobMatchingResumeBtn, true, source === "resume" ? "กำลังวิเคราะห์ Resume..." : "วิเคราะห์จาก Resume");
  showMessage(jobMatchingMessage, loadingText, "loading");

  try {
    const result = await getMyJobMatches({ source });
    if (!Array.isArray(result?.matches)) {
      throw new Error("Invalid matching response");
    }
    await waitForJobMatchingProgressMinimum();
    await completeJobMatchingProgress(sourceLabel);
    lastMatchingSource = source;
    jobMatchingResultSource.textContent = `วิเคราะห์จาก: ${sourceLabel}`;
    jobMatchingResultSource.hidden = false;
    renderJobMatches(result.matches);
    jobMatchingLoading.hidden = true;
    jobMatchingResults.classList.add("job-matching-content-in");
    jobMatchingEmpty.hidden = result.matches.length !== 0;
    if (!result.matches.length) {
      jobMatchingEmpty.classList.add("job-matching-content-in");
    }
    clearMessage(jobMatchingMessage);
    if (result.matches.length) {
      showMessage(jobMatchingMessage, `วิเคราะห์จาก${sourceLabel}เสร็จแล้ว พบตำแหน่งงานที่เหมาะสม ${result.matches.length} ตำแหน่ง`, "success");
    } else {
      showMessage(jobMatchingMessage, `วิเคราะห์จาก${sourceLabel}เสร็จแล้ว`, "success");
    }
    jobMatchingMessage.classList.add("job-matching-content-in");
  } catch (error) {
    stopJobMatchingProgress();
    jobMatchingLoading.hidden = true;
    jobMatchingResults.replaceChildren();
    jobMatchingResultSource.hidden = true;
    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }
    showMessage(
      jobMatchingMessage,
      JOB_MATCHING_CODE_ERRORS[error.data?.code] || JOB_MATCHING_ERRORS[error.status] || "ไม่สามารถค้นหาตำแหน่งงานที่เหมาะสมได้ กรุณาลองใหม่อีกครั้ง",
      "error",
    );
    jobMatchingMessage.classList.add("job-matching-content-in");
  } finally {
    stopJobMatchingProgress();
    jobMatchingLoading.hidden = true;
    isJobMatchingLoading = false;
    jobMatchingResults.setAttribute("aria-busy", "false");
    setButtonLoading(jobMatchingSkillsBtn, false, "กำลังวิเคราะห์ทักษะ...");
    setButtonLoading(jobMatchingResumeBtn, false, "กำลังวิเคราะห์ Resume...");
  }
}

jobMatchingSkillsBtn?.addEventListener("click", () => loadJobMatches("skills"));
jobMatchingResumeBtn?.addEventListener("click", () => loadJobMatches("resume"));
document.getElementById("editJobMatchingProfileBtn")?.addEventListener("click", () => {
  document.querySelector('.sidebar-item[data-target="panel-profile"]')?.click();
});

// ==============================
// Resume
// ==============================

const resumeFile =
  document.getElementById(
    "resumeFile"
  );

const uploadResumeBtn =
  document.getElementById(
    "uploadResumeBtn"
  );

const resumeMessage =
  document.getElementById(
    "resumeMessage"
  );

let isResumeUploading = false;

uploadResumeBtn?.addEventListener(
  "click",
  async () => {
    if (isResumeUploading) {
      return;
    }

    clearMessage(
      resumeMessage
    );

    const file =
      resumeFile?.files?.[0];

    if (!file) {
      showMessage(
        resumeMessage,
        "กรุณาเลือกไฟล์เรซูเม่",
        "error"
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage(resumeMessage, "ไฟล์ Resume ต้องไม่เกิน 10MB", "error");
      return;
    }

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      showMessage(
        resumeMessage,
        "รองรับเฉพาะไฟล์ PDF",
        "error"
      );

      return;
    }

    isResumeUploading = true;
    resumeFile.disabled = true;
    setButtonLoading(uploadResumeBtn, true, "กำลังอัปโหลด...", "อัปโหลดเรซูเม่");

    try {
      const result = await uploadStudentResume(file);
      const resume = result?.resume || result?.data || result || {};
      const details = [];
      if (resume.original_name) details.push(resume.original_name);
      if (Number.isFinite(Number(resume.file_size))) {
        details.push(`${(Number(resume.file_size) / (1024 * 1024)).toFixed(2)} MB`);
      }
      const message = "อัปโหลดเรซูเม่เรียบร้อยแล้ว";
      const extractionMessage = resume.extraction_status === "ready"
        ? resume.extraction_method === "ocr"
          ? "อ่านข้อความด้วย OCR สำเร็จ"
          : "อ่านข้อความจาก PDF สำเร็จ"
        : "ไม่สามารถอ่านข้อความจากไฟล์ได้ ระบบจะวิเคราะห์จากสาขาและทักษะที่เกี่ยวข้อง";
      showMessage(resumeMessage, [message, extractionMessage, ...details].join(" · "), "success");
      showToast(message, "success");
    } catch (error) {
      if (error?.status === 401) {
        clearAuthentication();
        redirectToLogin();
        return;
      }

      const safeMessages = {
        400: error.data?.message === "รองรับเฉพาะไฟล์ PDF (application/pdf)"
          ? "รองรับเฉพาะไฟล์ PDF"
          : error.data?.message === "ไฟล์ Resume ต้องไม่เกิน 10MB"
            ? "ไฟล์ Resume ต้องไม่เกิน 10MB"
            : "ไม่สามารถอัปโหลดเรซูเม่ได้ กรุณาตรวจสอบไฟล์แล้วลองใหม่",
        404: "ไม่พบข้อมูลนักศึกษา",
      };
      showMessage(
        resumeMessage,
        safeMessages[error?.status] || "ไม่สามารถอัปโหลดเรซูเม่ได้ กรุณาลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      isResumeUploading = false;
      resumeFile.disabled = false;
      setButtonLoading(uploadResumeBtn, false, "กำลังอัปโหลด...", "อัปโหลดเรซูเม่");
    }
  }
);

// ==============================
// Cooperative request
// ==============================

const COOP_ACTIVE_STATUSES = new Set([
  "submitted",
  "staff_review",
  "advisor_review",
  "department_head_review",
  "approved",
  "document_issued",
  "in_progress",
]);

const COOP_CANCELLABLE_STATUSES = new Set([
  "submitted",
  "staff_review",
  "advisor_review",
  "department_head_review",
]);

const COOP_STATUS_META = {
  submitted: {
    label: "ยื่นคำร้องแล้ว",
    summary: "ส่งคำร้องเรียบร้อยแล้ว กำลังรออาจารย์ที่ปรึกษาประจำชั้นพิจารณา",
    step: 1,
  },
  staff_review: {
    label: "สถานะเดิม: รอเจ้าหน้าที่",
    summary: "คำร้องจากกระบวนการเดิม กรุณาตรวจสอบสถานะหลังปรับปรุงระบบ",
    step: 2,
  },
  advisor_review: {
    label: "รออาจารย์ที่ปรึกษาพิจารณา",
    summary: "คำร้องอยู่ระหว่างรออาจารย์ที่ปรึกษาพิจารณา",
    step: 2,
  },
  department_head_review: {
    label: "รอหัวหน้าภาควิชาพิจารณา",
    summary: "ผ่านการอนุมัติจากอาจารย์ที่ปรึกษาแล้ว รอหัวหน้าภาควิชาพิจารณา",
    step: 3,
  },
  approved: {
    label: "อนุมัติแล้ว",
    summary: "คำร้องได้รับการอนุมัติแล้ว",
    step: 4,
    approvalComplete: true,
  },
  document_issued: {
    label: "ออกเอกสารแล้ว",
    summary: "ระบบดำเนินการออกเอกสารส่งตัวแล้ว",
    step: 4,
    approvalComplete: true,
  },
  in_progress: {
    label: "กำลังปฏิบัติงานสหกิจศึกษา",
    summary: "คุณอยู่ระหว่างปฏิบัติงานสหกิจศึกษา",
    step: 4,
    approvalComplete: true,
  },
  rejected: {
    label: "ไม่ได้รับการอนุมัติ",
    summary: "คำร้องนี้ไม่ได้รับการอนุมัติ คุณสามารถตรวจสอบรายละเอียดได้จากประวัติคำร้อง",
    step: 0,
    terminal: true,
  },
  cancelled: {
    label: "ยกเลิกคำร้อง",
    summary: "คำร้องนี้ถูกยกเลิกแล้ว คุณสามารถสร้างคำร้องใหม่ได้เมื่อพร้อม",
    step: 0,
    terminal: true,
  },
};

const COOP_DELIVERY_LABELS = {
  self_submit: "นักศึกษานำหนังสือไปยื่นด้วยตนเอง",
  postal: "ให้ภาควิชาฯ จัดส่งให้ทางไปรษณีย์",
  email: "จัดส่งให้ทาง E-mail",
};

const createRequestBtn = document.getElementById("createRequestBtn");
const createAnotherCoopRequestBtn = document.getElementById("createAnotherCoopRequestBtn");
const coopRequestMessage = document.getElementById("coopRequestMessage");
const coopRequestEmpty = document.getElementById("coopRequestEmpty");
const coopRequestCurrent = document.getElementById("coopRequestCurrent");
const coopRequestHistory = document.getElementById("coopRequestHistory");
const coopRequestHistoryBody = document.getElementById("coopRequestHistoryBody");
const coopRequestHistoryEmpty = document.getElementById("coopRequestHistoryEmpty");
const coopCurrentStatus = document.getElementById("coopCurrentStatus");
const coopCurrentHeading = document.getElementById("coopCurrentHeading");
const coopCurrentSubheading = document.getElementById("coopCurrentSubheading");
const coopCurrentStatusSummary = document.getElementById("coopCurrentStatusSummary");
const coopCurrentCompany = document.getElementById("coopCurrentCompany");
const coopCurrentProvince = document.getElementById("coopCurrentProvince");
const coopCurrentSubmittedAt = document.getElementById("coopCurrentSubmittedAt");
const coopCurrentStartDate = document.getElementById("coopCurrentStartDate");
const coopCurrentEndDate = document.getElementById("coopCurrentEndDate");
const coopCurrentDeliveryMethods = document.getElementById("coopCurrentDeliveryMethods");
const coopCurrentStepper = document.getElementById("coopCurrentStepper");
const viewCurrentCoopRequestBtn = document.getElementById("viewCurrentCoopRequestBtn");
const cancelCoopRequestBtn = document.getElementById("cancelCoopRequestBtn");
const coopRequestModal = document.getElementById("coopRequestModal");
const closeCoopRequestModalBtn = document.getElementById("closeCoopRequestModal");
const cancelCoopRequestModalBtn = document.getElementById("cancelCoopRequestModal");
const coopRequestForm = document.getElementById("coopRequestForm");
const coopRequestFormMessage = document.getElementById("coopRequestFormMessage");
const coopCompanySearch = document.getElementById("coopCompanySearch");
const coopCompanySearchResults = document.getElementById("coopCompanySearchResults");
const coopManualCompanyBtn = document.getElementById("coopManualCompanyBtn");
const coopCompanyDuplicateMessage = document.getElementById("coopCompanyDuplicateMessage");
const coopSelectedJobPosting = document.getElementById("coopSelectedJobPosting");
let selectedCoopCompanyId = null;
let selectedCoopJobPostingId = null;
let companySearchTimer = null;
const saveCoopRequestBtn = document.getElementById("saveCoopRequestBtn");
const coopRequestDetailModal = document.getElementById("coopRequestDetailModal");
const closeCoopRequestDetailModalBtn = document.getElementById("closeCoopRequestDetailModal");
const coopRequestDetailContent = document.getElementById("coopRequestDetailContent");
const coopRequestDetailMessage = document.getElementById("coopRequestDetailMessage");
const coopRequestDetailData = document.getElementById("coopRequestDetailData");
const coopDetailStudent = document.getElementById("coopDetailStudent");
const coopDetailDocument = document.getElementById("coopDetailDocument");
const coopDetailRequest = document.getElementById("coopDetailRequest");
const coopDetailDeliveryMethods = document.getElementById("coopDetailDeliveryMethods");
const coopDetailSigner = document.getElementById("coopDetailSigner");
const coopDetailStepper = document.getElementById("coopDetailStepper");
const coopDetailStatus = document.getElementById("coopDetailStatus");
const coopAdvisorName = document.getElementById("coopAdvisorName");
const coopDetailAdvisorName = document.getElementById("coopDetailAdvisorName");
const closeCoopRequestDetailFooterBtn = document.getElementById("closeCoopRequestDetailFooterBtn");

let coopRequests = [];
let currentCoopRequest = null;
let coopRequestsLoading = false;
let coopRequestSubmitting = false;
let coopRequestCancelling = false;
let coopRequestDetailLoading = false;
let coopRequestModalReturnFocus = null;
let coopRequestDetailModalReturnFocus = null;

// Student.major is the saved Profile source; unsaved Profile edits are not used.
const COOP_PREREQUISITE_COURSES = {
  IT: [
    { course_code: "060243102", course_name: "การโปรแกรมคอมพิวเตอร์", english_name: "Computer Programming" },
    { course_code: "060243104", course_name: "การเขียนโปรแกรมเชิงวัตถุ", english_name: "Object-oriented Programming" },
    { course_code: "060243108", course_name: "ระบบฐานข้อมูล", english_name: "Database System" },
    { course_code: "060243112", course_name: "การวิเคราะห์และออกแบบระบบ", english_name: "System Analysis and Design" },
    { course_code: "060243122", course_name: "เว็บแอปพลิเคชัน", english_name: "Web Application" },
  ],
  INE: [
    { course_code: "060233107", course_name: "ระบบฐานข้อมูล" },
    { course_code: "060233112", course_name: "วิศวกรรมข้อมูล" },
    { course_code: "060233113", course_name: "การเขียนโปรแกรมคอมพิวเตอร์ขั้นสูง" },
    { course_code: "060233202", course_name: "ปฏิบัติการวิศวกรรมเครือข่าย 2" },
    { course_code: "060233204", course_name: "การออกแบบและการจัดทำเครือข่ายคอมพิวเตอร์" },
  ],
};
const coopPrerequisiteCourses = document.getElementById("coopPrerequisiteCourses");
const coopPrerequisiteContext = document.getElementById("coopPrerequisiteContext");
let coopPrerequisiteProgram = null;
let coopPrerequisiteState = new Map();

function syncCoopPrerequisiteProgram(reset = false) {
  const major = currentStudent?.major;
  const program = major === "IT" || major === "INE" ? major : null;
  if (reset || program !== coopPrerequisiteProgram) {
    coopPrerequisiteProgram = program;
    // Discard old course state rather than reusing positional values across programs.
    coopPrerequisiteState = new Map();
    renderCoopPrerequisiteCourses();
  }
}

function getCoopPrerequisiteData() {
  syncCoopPrerequisiteProgram();
  return (COOP_PREREQUISITE_COURSES[coopPrerequisiteProgram] || []).map((course) => {
    const state = coopPrerequisiteState.get(course.course_code);
    const status = state?.status === "passed" || state?.status === "studying" ? state.status : null;
    return {
      course_code: course.course_code,
      course_name: course.course_name,
      status,
      grade: status === "passed" ? String(state?.grade || "").trim() || null : null,
    };
  });
}

function renderCoopPrerequisiteCourses() {
  if (!coopPrerequisiteCourses) return;
  coopPrerequisiteCourses.replaceChildren();
  const courses = COOP_PREREQUISITE_COURSES[coopPrerequisiteProgram] || [];
  setText(coopPrerequisiteContext, coopPrerequisiteProgram === "IT"
    ? "สำหรับหลักสูตรวิทยาศาสตรบัณฑิต (IT)"
    : coopPrerequisiteProgram === "INE" ? "สำหรับหลักสูตรวิศวกรรมศาสตรบัณฑิต (INE)" : "ไม่พบสาขา IT / INE ในข้อมูลประวัตินักศึกษา");
  if (!courses.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "กรุณาตรวจสอบสาขาในข้อมูลประวัตินักศึกษา";
    row.append(cell);
    coopPrerequisiteCourses.append(row);
    return;
  }
  courses.forEach((course) => {
    const code = course.course_code;
    const state = coopPrerequisiteState.get(code) || { status: null, grade: null };
    coopPrerequisiteState.set(code, state);
    const row = document.createElement("tr");
    row.dataset.courseCode = code;
    const name = document.createElement("td");
    name.textContent = `${code} ${course.course_name}${course.english_name ? ` (${course.english_name})` : ""}`;
    const gradeCell = document.createElement("td");
    const grade = document.createElement("input");
    grade.type = "text";
    grade.id = `coop-grade-${code}`;
    grade.maxLength = 10;
    grade.setAttribute("aria-label", `ผลการเรียน ${code}`);
    grade.value = state.grade || "";
    const statusCell = document.createElement("td");
    const status = document.createElement("select");
    status.id = `coop-status-${code}`;
    status.setAttribute("aria-label", `สถานะ ${code}`);
    [["", "ยังไม่เลือก"], ["passed", "ผ่านแล้ว"], ["studying", "กำลังศึกษา"]].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      status.append(option);
    });
    status.value = state.status || "";
    const updateGrade = () => {
      grade.required = state.status === "passed";
      grade.disabled = coopRequestSubmitting || state.status !== "passed";
    };
    status.addEventListener("change", () => {
      // Ignore detached rows if Profile reloaded while an event was pending.
      if (coopPrerequisiteState.get(code) !== state) return;
      state.status = status.value || null;
      if (state.status !== "passed") { state.grade = null; grade.value = ""; }
      updateGrade();
    });
    grade.addEventListener("input", () => {
      if (coopPrerequisiteState.get(code) === state && state.status === "passed") state.grade = grade.value;
    });
    status.disabled = coopRequestSubmitting;
    updateGrade();
    gradeCell.append(grade);
    statusCell.append(status);
    row.append(name, gradeCell, statusCell);
    coopPrerequisiteCourses.append(row);
  });
}

function validateCoopPrerequisites(courses) {
  const missingGrade = courses.find((course) => course.status === "passed" && !course.grade?.trim());
  return missingGrade ? `กรุณาระบุผลการเรียนของรายวิชา ${missingGrade.course_code} ที่ผ่านแล้ว` : null;
}

function showDuplicateCoopRequestAlert() {
  showActionModal({
    title: "มีคำร้องสหกิจศึกษาที่กำลังดำเนินการอยู่",
    message: "คุณมีคำร้องสหกิจศึกษาที่ยังดำเนินการอยู่ จึงยังไม่สามารถยื่นคำร้องใหม่ได้",
    detail: "กรุณาตรวจสอบสถานะหรือยกเลิกคำร้องเดิมก่อน",
    actionLabel: "ไปยังคำร้องปัจจุบัน",
    closeLabel: "ปิด",
    onAction: async () => {
      await activateDashboardPanel("panel-request");
      const target = coopRequestCurrent || coopRequestHistory;
      target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      target?.focus?.({ preventScroll: true });
    },
  });
}

function resetCoopRequestCreateForm() {
  coopRequestForm?.reset();
  syncCoopPrerequisiteProgram(true);
  selectedCoopCompanyId = null;
  selectedCoopJobPostingId = null;
  if (coopCompanySearch) coopCompanySearch.value = "";
  if (coopSelectedJobPosting) {
    coopSelectedJobPosting.hidden = true;
    coopSelectedJobPosting.textContent = "";
  }
  applyCoopCompany(null);
  clearMessage(coopRequestFormMessage);
}

function getCoopRequestStatusMeta(status) {
  return COOP_STATUS_META[status] || {
    label: "ไม่ทราบสถานะ",
    summary: "ไม่สามารถระบุสถานะคำร้องจากข้อมูลที่ได้รับ",
    step: 0,
    terminal: true,
  };
}

function getCoopDeliveryMethodLabels(request) {
  const methods = request?.deliveryMethods || [];
  return methods
    .map((item) => COOP_DELIVERY_LABELS[item?.method])
    .filter(Boolean);
}

function getCoopDeliveryMethods(request) {
  const labels = getCoopDeliveryMethodLabels(request);
  return labels.length ? labels.join(", ") : "ไม่พบข้อมูล";
}

function getCoopStudentFullName(student, profile) {
  return [profile?.prefix, student?.first_name, student?.last_name]
    .filter(Boolean)
    .join(" ") || "ไม่พบข้อมูล";
}

function formatCoopDate(value, includeTime = false) {
  if (!value) return "ไม่พบข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ไม่พบข้อมูล";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

function createCoopDetailItem(label, value, full = false) {
  const item = document.createElement("div");
  if (full) item.className = "coop-readonly-full";
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");
  labelElement.textContent = label;
  valueElement.textContent = value || "ไม่พบข้อมูล";
  item.append(labelElement, valueElement);
  return item;
}

function renderCoopStepper(container, request) {
  if (!container) return;
  const status = getCoopRequestStatusMeta(request?.status);
  const steps = ["ยื่นคำร้อง", "อาจารย์ที่ปรึกษาพิจารณา", "หัวหน้าภาควิชาพิจารณา", "อนุมัติคำร้อง"];
  container.replaceChildren();
  steps.forEach((label, index) => {
    const step = document.createElement("div");
    const stepNumber = index + 1;
    step.className = "coop-step";
    if (!status.terminal && (stepNumber < status.step || status.approvalComplete)) step.classList.add("is-complete");
    if (!status.terminal && !status.approvalComplete && stepNumber === status.step) step.classList.add("is-current");
    const marker = document.createElement("span");
    const text = document.createElement("span");
    marker.textContent = step.classList.contains("is-complete") ? "✓" : String(stepNumber);
    marker.setAttribute("aria-hidden", "true");
    text.textContent = label;
    step.append(marker, text);
    container.append(step);
  });
  if (status.terminal) {
    const terminal = document.createElement("p");
    terminal.className = "coop-terminal-status";
    terminal.textContent = status.label;
    container.append(terminal);
  }
}

function renderCoopRequests() {
  const isBusy = coopRequestsLoading || coopRequestSubmitting || coopRequestCancelling;
  const history = [...coopRequests].sort((a, b) => {
    const submittedDifference = (Date.parse(b.submitted_at) || 0) - (Date.parse(a.submitted_at) || 0);
    if (submittedDifference) return submittedDifference;
    return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0);
  });
  currentCoopRequest = history.find((request) => COOP_ACTIVE_STATUSES.has(request.status)) || null;

  if (coopRequestEmpty) coopRequestEmpty.hidden = Boolean(currentCoopRequest) || coopRequestsLoading;
  if (coopRequestCurrent) coopRequestCurrent.hidden = !currentCoopRequest;
  if (coopRequestHistory) coopRequestHistory.hidden = coopRequestsLoading;
  if (createRequestBtn) createRequestBtn.disabled = isBusy;
  if (createAnotherCoopRequestBtn) createAnotherCoopRequestBtn.disabled = isBusy;

  if (currentCoopRequest) {
    const status = getCoopRequestStatusMeta(currentCoopRequest.status);
    coopCurrentStatus.textContent = status.label;
    coopCurrentStatus.className = `coop-status-badge is-${currentCoopRequest.status}`;
    setText(
      coopCurrentHeading,
      currentCoopRequest.company_name || "ไม่พบข้อมูล",
    );
    setText(
      coopCurrentSubheading,
      `คำร้องสหกิจศึกษาปัจจุบัน · จังหวัด ${currentCoopRequest.company_province || "ไม่พบข้อมูล"}`,
    );
    setText(coopCurrentStatusSummary, status.summary);
    setText(coopCurrentCompany, currentCoopRequest.company_name || "ไม่พบข้อมูล");
    setText(coopCurrentProvince, currentCoopRequest.company_province || "ไม่พบข้อมูล");
    setText(coopCurrentSubmittedAt, formatCoopDate(currentCoopRequest.submitted_at, true));
    setText(coopCurrentStartDate, formatCoopDate(currentCoopRequest.work_start_date));
    setText(coopCurrentEndDate, formatCoopDate(currentCoopRequest.work_end_date));
    setText(coopCurrentDeliveryMethods, getCoopDeliveryMethods(currentCoopRequest));
    renderCoopStepper(coopCurrentStepper, currentCoopRequest);
    if (cancelCoopRequestBtn) {
      cancelCoopRequestBtn.hidden = !COOP_CANCELLABLE_STATUSES.has(currentCoopRequest.status);
      cancelCoopRequestBtn.disabled = isBusy;
    }
    if (viewCurrentCoopRequestBtn) viewCurrentCoopRequestBtn.disabled = isBusy;
  }

  if (coopRequestHistoryBody) {
    coopRequestHistoryBody.replaceChildren();
    history.forEach((request) => {
      const row = document.createElement("tr");
      const values = [
        request.company_name || "ไม่พบข้อมูล",
        request.company_province || "ไม่พบข้อมูล",
        formatCoopDate(request.submitted_at),
        getCoopRequestStatusMeta(request.status).label,
      ];
      values.forEach((value, index) => {
        const cell = document.createElement("td");
        if (index === 3) {
          const badge = document.createElement("span");
          badge.className = `coop-status-badge is-${request.status}`;
          badge.textContent = value;
          cell.append(badge);
        } else {
          cell.textContent = value;
        }
        row.append(cell);
      });
      const action = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn-secondary coop-history-detail";
      button.dataset.requestId = request.id;
      button.disabled = isBusy;
      button.textContent = "ดูรายละเอียด";
      action.append(button);
      row.append(action);
      coopRequestHistoryBody.append(row);
    });
  }
  if (coopRequestHistoryEmpty) coopRequestHistoryEmpty.hidden = history.length > 0;
}

function getCoopRequestErrorMessage(error, action) {
  if (error?.status === 401) return "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  if (error?.status === 409) return "คุณมีคำร้องสหกิจศึกษาที่ยังดำเนินการอยู่แล้ว";
  if (error?.status === 404) return "ไม่พบคำร้องสหกิจศึกษา";
  return error?.message || `ไม่สามารถ${action}คำร้องสหกิจศึกษาได้ กรุณาลองใหม่อีกครั้ง`;
}

async function loadCoopRequests() {
  if (coopRequestsLoading || coopRequestSubmitting || coopRequestCancelling) return false;
  coopRequestsLoading = true;
  renderCoopRequests();
  showMessage(coopRequestMessage, "กำลังโหลดคำร้องสหกิจศึกษา...", "loading");
  try {
    const result = await getMyCoopRequests();
    coopRequests = Array.isArray(result?.data) ? result.data : [];
    clearMessage(coopRequestMessage);
    return true;
  } catch (error) {
    coopRequests = [];
    showMessage(coopRequestMessage, getCoopRequestErrorMessage(error, "โหลด"), "error");
    return false;
  } finally {
    coopRequestsLoading = false;
    renderCoopRequests();
  }
}

function renderReadonlyStudentData() {
  const profile = currentStudentProfile || currentStudent?.profile || {};
  const fullName = getCoopStudentFullName(currentStudent, profile);
  setText(document.getElementById("coopStudentName"), fullName);
  setText(document.getElementById("coopStudentId"), currentStudent?.student_id || "ไม่พบข้อมูล");
  setText(document.getElementById("coopStudentYear"), currentStudent?.year_level ? `ชั้นปี ${currentStudent.year_level}` : "ไม่พบข้อมูล");
  setText(document.getElementById("coopStudentGpa"), currentStudent?.gpa ?? "ไม่พบข้อมูล");
  setText(document.getElementById("coopStudentPhone"), profile.current_phone || "ไม่พบข้อมูล");
  setText(document.getElementById("coopStudentEmail"), currentStudent?.email || "ไม่พบข้อมูล");
  setText(document.getElementById("coopSignerName"), fullName);
  setText(document.getElementById("coopSignerFullName"), fullName);
  setText(coopAdvisorName, getCoopAdvisorName(currentStudent));
}

function getCoopAdvisorName(student) {
  return student?.advisorTeacher
    ? formatTeacherName(student.advisorTeacher)
    : "ยังไม่ได้กำหนดอาจารย์ที่ปรึกษาประจำชั้น";
}

function setCoopRequestFormSubmitting(isSubmitting) {
  coopRequestForm?.setAttribute("aria-busy", String(isSubmitting));
  coopRequestForm?.querySelectorAll("input, select, textarea, button").forEach((element) => {
    element.disabled = isSubmitting;
  });
  renderCoopPrerequisiteCourses();
  setButtonLoading(
    saveCoopRequestBtn,
    isSubmitting,
    "กำลังยื่นคำร้อง...",
    "ยื่นคำร้อง",
  );
}

function applyCoopCompany(company) {
  selectedCoopCompanyId = company?.id || null;
  const name = document.getElementById("coopCompanyName");
  const province = document.getElementById("coopCompanyProvince");
  const address = document.getElementById("coopCompanyAddress");
  name.value = company?.name || "";
  province.value = company?.province || "";
  if (company?.province && province.value !== company.province) {
    const option = document.createElement("option"); option.value = company.province; option.textContent = company.province; province.append(option); province.value = company.province;
  }
  address.value = company ? [company.address_no, company.moo, company.subdistrict, company.district, company.province].filter(Boolean).join(" ") : "";
  name.readOnly = Boolean(company);
  province.disabled = Boolean(company);
  address.readOnly = Boolean(company);
  if (coopCompanySearchResults) coopCompanySearchResults.replaceChildren();
  if (coopCompanyDuplicateMessage) coopCompanyDuplicateMessage.textContent = "";
}

function openCoopRequestModal() {
  if (currentCoopRequest) {
    showDuplicateCoopRequestAlert();
    return false;
  }
  if (coopRequestSubmitting) return false;
  coopRequestModalReturnFocus = document.activeElement;
  renderReadonlyStudentData();
  coopRequestForm?.reset();
  syncCoopPrerequisiteProgram(true);
  selectedCoopCompanyId = null;
  selectedCoopJobPostingId = null;
  if (coopCompanySearch) coopCompanySearch.value = "";
  if (coopSelectedJobPosting) { coopSelectedJobPosting.hidden = true; coopSelectedJobPosting.textContent = ""; }
  applyCoopCompany(null);
  clearMessage(coopRequestFormMessage);
  setCoopRequestFormSubmitting(false);
  coopRequestModal?.classList.add("open");
  coopRequestModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.requestAnimationFrame(() => document.getElementById("coopCompanyName")?.focus());
  return true;
}

function closeCoopRequestModal() {
  if (coopRequestSubmitting) return;
  coopRequestModal?.classList.remove("open");
  coopRequestModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  coopRequestModalReturnFocus?.focus?.();
  coopRequestModalReturnFocus = null;
}

function getCoopRequestFormData() {
  return {
    prerequisite_courses: getCoopPrerequisiteData(),
    company_id: selectedCoopCompanyId,
    job_posting_id: selectedCoopJobPostingId,
    company_name: document.getElementById("coopCompanyName").value.trim(),
    company_province: document.getElementById("coopCompanyProvince").value.trim(),
    letter_recipient_name: document.getElementById("coopLetterRecipientName").value.trim(),
    letter_recipient_position_department: document.getElementById("coopRecipientPosition").value.trim(),
    company_address: document.getElementById("coopCompanyAddress").value.trim(),
    work_start_date: document.getElementById("coopWorkStartDate").value,
    work_end_date: document.getElementById("coopWorkEndDate").value,
    delivery_methods: Array.from(document.querySelectorAll('input[name="delivery_methods"]:checked')).map((input) => input.value),
  };
}

function validateCoopRequestForm(data) {
  const requiredFields = ["company_name", "company_province", "letter_recipient_name", "company_address", "work_start_date", "work_end_date"];
  if (requiredFields.some((field) => !data[field])) return "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน";
  if (!data.delivery_methods.length) return "กรุณาเลือกวิธีจัดส่งหนังสืออย่างน้อย 1 วิธี";
  if (data.work_end_date < data.work_start_date) return "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มปฏิบัติงาน";
  return validateCoopPrerequisites(data.prerequisite_courses);
}

async function submitCoopRequestForm(event) {
  event.preventDefault();
  if (coopRequestSubmitting) return;
  const data = getCoopRequestFormData();
  const validationError = validateCoopRequestForm(data);
  if (validationError) {
    showMessage(coopRequestFormMessage, validationError, "error");
    return;
  }
  coopRequestSubmitting = true;
  setCoopRequestFormSubmitting(true);
  renderCoopRequests();
  try {
    const { prerequisite_courses, ...requestPayload } = data;
    requestPayload.prerequisite_courses = prerequisite_courses.map(({course_code, status, grade}) => ({course_code, status: status || 'unselected', grade}));
    await createCoopRequest(requestPayload);
    coopRequestSubmitting = false;
    closeCoopRequestModal();
    resetCoopRequestCreateForm();
    const loaded = await activateDashboardPanel("panel-request");
    showToast("ยื่นคำร้องสหกิจศึกษาเรียบร้อยแล้ว", "success");
    if (loaded) {
      showMessage(coopRequestMessage, "ยื่นคำร้องสหกิจศึกษาเรียบร้อยแล้ว", "success");
      const currentCard = document.getElementById("coopRequestCurrent");
      currentCard?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      currentCard?.focus?.({ preventScroll: true });
    }
  } catch (error) {
    if (error?.status === 409) {
      coopRequestSubmitting = false;
      setCoopRequestFormSubmitting(false);
      closeCoopRequestModal();
      resetCoopRequestCreateForm();
      await loadCoopRequests();
      showDuplicateCoopRequestAlert();
      return;
    }
    showMessage(coopRequestFormMessage, getCoopRequestErrorMessage(error, "ยื่น"), "error");
  } finally {
    coopRequestSubmitting = false;
    setCoopRequestFormSubmitting(false);
    renderCoopRequests();
  }
}

function closeCoopRequestDetailModal() {
  if (coopRequestDetailLoading) return;
  coopRequestDetailModal?.classList.remove("open");
  coopRequestDetailModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  coopRequestDetailModalReturnFocus?.focus?.();
  coopRequestDetailModalReturnFocus = null;
}

function renderCoopRequestDetail(request) {
  renderCoopPrerequisiteSnapshot(request.prerequisite_courses);
  const status = getCoopRequestStatusMeta(request.status);
  const student = request.student || {};
  const profile = student.profile || {};
  const fullName = getCoopStudentFullName(student, profile);
  coopDetailDocument.replaceChildren(
    createCoopDetailItem("เรื่อง", "ขอจัดทำหนังสือขอความอนุเคราะห์รับนักศึกษาสหกิจศึกษา", true),
    createCoopDetailItem("เรียน", "หัวหน้าภาควิชาเทคโนโลยีสารสนเทศ", true),
  );
  coopDetailStudent.replaceChildren(
    createCoopDetailItem("ชื่อ-นามสกุล", fullName),
    createCoopDetailItem("รหัสนักศึกษา", student.student_id),
    createCoopDetailItem("ชั้นปี", student.year_level ? `ชั้นปี ${student.year_level}` : "ไม่พบข้อมูล"),
    createCoopDetailItem("GPA", student.gpa),
    createCoopDetailItem("เบอร์โทร", profile.current_phone),
    createCoopDetailItem("Email", student.email),
  );
  coopDetailRequest.replaceChildren(
    createCoopDetailItem("ชื่อบริษัท / หน่วยงาน", request.company_name, true),
    createCoopDetailItem("เรียนถึง", request.letter_recipient_name),
    createCoopDetailItem("ตำแหน่ง / หน่วยงานผู้รับหนังสือ", request.letter_recipient_position_department),
    createCoopDetailItem("จังหวัด", request.company_province),
    createCoopDetailItem("ที่อยู่", request.company_address, true),
    createCoopDetailItem("เริ่มปฏิบัติงาน", formatCoopDate(request.work_start_date)),
    createCoopDetailItem("สิ้นสุดปฏิบัติงาน", formatCoopDate(request.work_end_date)),
  );
  const rejection = [...(request.reviews || [])].reverse().find(review => review.decision === "reject");
  if (request.status === "rejected" && rejection?.reason) {
    coopDetailRequest.append(createCoopDetailItem("เหตุผลที่ไม่ได้รับการอนุมัติ", rejection.reason, true));
  }
  coopDetailDeliveryMethods.replaceChildren();
  const deliveryLabels = getCoopDeliveryMethodLabels(request);
  if (deliveryLabels.length) {
    deliveryLabels.forEach((label) => {
      const item = document.createElement("span");
      item.className = "coop-detail-chip";
      item.textContent = label;
      coopDetailDeliveryMethods.append(item);
    });
  } else {
    const unavailable = document.createElement("p");
    unavailable.className = "coop-unavailable";
    unavailable.textContent = "ไม่พบข้อมูลวิธีจัดส่งหนังสือ";
    coopDetailDeliveryMethods.append(unavailable);
  }
  coopDetailSigner.replaceChildren(
    createCoopDetailItem("ลงชื่อ", fullName),
    createCoopDetailItem("ชื่อ-สกุล", fullName),
  );
  setText(coopDetailAdvisorName, getCoopAdvisorName(student));
  if (coopDetailStatus) {
    coopDetailStatus.className = `coop-status-badge is-${request.status}`;
    coopDetailStatus.textContent = status.label;
  }
  renderCoopStepper(coopDetailStepper, request);
}

function renderCoopPrerequisiteSnapshot(snapshot) {
  const body = document.getElementById('coopDetailPrerequisites');
  if (!body) return;
  body.replaceChildren();
  // Request-owned snapshots, never regenerated from the current Student.major.
  const courses = Array.isArray(snapshot) ? snapshot : [];
  if (!courses.length) {
    const row = document.createElement('tr'); const cell = document.createElement('td');
    cell.colSpan = 3; cell.textContent = 'คำร้องเดิมไม่มีข้อมูลรายวิชาที่บันทึกไว้'; row.append(cell); body.append(row);
    setText(document.getElementById('coopDetailPrerequisiteProgram'), '');
    return;
  }
  setText(document.getElementById('coopDetailPrerequisiteProgram'), `หลักสูตรที่ยื่นคำร้อง: ${courses[0].program || '-'}`);
  const labels = {passed: 'ผ่านแล้ว', studying: 'กำลังศึกษา', unselected: 'ยังไม่เลือก'};
  [...courses].sort((a,b) => String(a.course_code).localeCompare(String(b.course_code))).forEach(course => {
    const row = document.createElement('tr'); row.dataset.courseCode = course.course_code;
    for (const value of [`${course.course_code} ${course.course_name}${course.english_name ? ` (${course.english_name})` : ''}`, course.status === 'passed' ? course.grade || '-' : '-', labels[course.status] || 'ไม่พบสถานะ']) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    body.append(row);
  });
}

async function openCoopRequestDetail(id) {
  if (!id || coopRequestDetailLoading) return;
  coopRequestDetailModalReturnFocus = document.activeElement;
  coopRequestDetailModal?.classList.add("open");
  coopRequestDetailModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.requestAnimationFrame(() => closeCoopRequestDetailModalBtn?.focus());
  coopRequestDetailLoading = true;
  coopRequestDetailContent?.setAttribute("aria-busy", "true");
  coopRequestDetailData.hidden = true;
  showMessage(coopRequestDetailMessage, "กำลังโหลดรายละเอียดคำร้อง...", "loading");
  try {
    const result = await getCoopRequestById(id);
    renderCoopRequestDetail(result?.data || {});
    clearMessage(coopRequestDetailMessage);
    coopRequestDetailData.hidden = false;
  } catch (error) {
    showMessage(coopRequestDetailMessage, getCoopRequestErrorMessage(error, "โหลดรายละเอียด"), "error");
  } finally {
    coopRequestDetailLoading = false;
    coopRequestDetailContent?.setAttribute("aria-busy", "false");
  }
}

async function cancelCoopRequestAfterConfirmation() {
  if (!currentCoopRequest || !COOP_CANCELLABLE_STATUSES.has(currentCoopRequest.status) || coopRequestCancelling) return;
  coopRequestCancelling = true;
  renderCoopRequests();
  showMessage(coopRequestMessage, "กำลังยกเลิกคำร้องสหกิจศึกษา...", "loading");
  try {
    await cancelCoopRequest(currentCoopRequest.id);
    coopRequestCancelling = false;
    const loaded = await loadCoopRequests();
    if (loaded) {
      showMessage(coopRequestMessage, "ยกเลิกคำร้องสหกิจศึกษาเรียบร้อยแล้ว", "success");
      showToast("ยกเลิกคำร้องสหกิจศึกษาเรียบร้อยแล้ว", "success");
    }
  } catch (error) {
    showMessage(coopRequestMessage, getCoopRequestErrorMessage(error, "ยกเลิก"), "error");
  } finally {
    coopRequestCancelling = false;
    renderCoopRequests();
  }
}

function confirmCancelCoopRequest() {
  if (!currentCoopRequest || !COOP_CANCELLABLE_STATUSES.has(currentCoopRequest.status)) return;
  showConfirmModal({
    title: "ยกเลิกคำร้องสหกิจศึกษา",
    message: "คุณต้องการยกเลิกคำร้องนี้ใช่หรือไม่? หลังยกเลิกแล้วสามารถยื่นคำร้องใหม่ได้",
    confirmLabel: "ยืนยันการยกเลิก",
    loadingLabel: "กำลังยกเลิก...",
    onConfirm: cancelCoopRequestAfterConfirmation,
  });
}

createRequestBtn?.addEventListener("click", openCoopRequestModal);
createAnotherCoopRequestBtn?.addEventListener("click", openCoopRequestModal);
coopCompanySearch?.addEventListener("input", () => {
  window.clearTimeout(companySearchTimer);
  const query = coopCompanySearch.value.trim();
  companySearchTimer = window.setTimeout(async () => {
    if (query.length < 2) { coopCompanySearchResults.replaceChildren(); return; }
    try {
      const result = await searchCompanies(query);
      const rows = (result?.data || []).map((company) => {
        const row = document.createElement("div"); row.className = "coop-company-result";
        const details = document.createElement("span"); details.textContent = `${company.name} — ${company.province}`;
        const select = document.createElement("button"); select.type = "button"; select.className = "btn-secondary"; select.textContent = "เลือก";
        select.addEventListener("click", () => applyCoopCompany(company)); row.append(details, select); return row;
      });
      if (!rows.length) { const empty = document.createElement("p"); empty.textContent = "ไม่พบข้อมูลบริษัท คุณสามารถกรอกข้อมูลเองได้"; rows.push(empty); }
      coopCompanySearchResults.replaceChildren(...rows);
    } catch (error) { showToast(error.message || "ค้นหาบริษัทไม่สำเร็จ", "error"); }
  }, 250);
});
coopManualCompanyBtn?.addEventListener("click", () => { selectedCoopCompanyId = null; applyCoopCompany(null); document.getElementById("coopCompanyName")?.focus(); });
document.getElementById("coopCompanyName")?.addEventListener("blur", async (event) => {
  if (selectedCoopCompanyId || !event.target.value.trim()) return;
  try {
    const result = await checkCompanyDuplicate(event.target.value.trim());
    const duplicates = result?.data || [];
    if (!duplicates.length) { coopCompanyDuplicateMessage.textContent = "ไม่พบชื่อบริษัทซ้ำ สามารถดำเนินการต่อได้"; return; }
    coopCompanyDuplicateMessage.replaceChildren(document.createTextNode("พบชื่อบริษัทที่อาจซ้ำ: "));
    duplicates.forEach((company) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "btn-secondary";
      button.textContent = `ใช้ ${company.name} (${company.province})`;
      button.addEventListener("click", () => applyCoopCompany(company));
      coopCompanyDuplicateMessage.append(button);
    });
  } catch (error) { showToast(error.message || "ตรวจสอบชื่อบริษัทไม่สำเร็จ", "error"); }
});
jobMatchingResults?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-job-posting-id]");
  if (!button || button.disabled) return;
  if (currentCoopRequest) {
    showDuplicateCoopRequestAlert();
    return;
  }
  setButtonLoading(button, true, "กำลังโหลดตำแหน่งงาน...", "เขียนคำร้องสหกิจสำหรับตำแหน่งนี้");
  try {
    const result = await getPublishedJobPostingForCoopRequest(button.dataset.jobPostingId);
    const job = result?.data;
    if (!job?.company) throw new Error("ไม่พบตำแหน่งงานที่เปิดรับ");
    selectedCoopJobPostingId = job.id;
    openCoopRequestModal();
    selectedCoopJobPostingId = job.id;
    applyCoopCompany(job.company);
    if (coopSelectedJobPosting) { coopSelectedJobPosting.textContent = `ตำแหน่งงาน: ${job.title}`; coopSelectedJobPosting.hidden = false; }
  } catch (error) { showToast(error.message || "โหลดตำแหน่งงานไม่สำเร็จ", "error"); }
  finally { setButtonLoading(button, false, "กำลังโหลดตำแหน่งงาน...", "เขียนคำร้องสหกิจสำหรับตำแหน่งนี้"); }
});
coopRequestForm?.addEventListener("submit", submitCoopRequestForm);
closeCoopRequestModalBtn?.addEventListener("click", closeCoopRequestModal);
cancelCoopRequestModalBtn?.addEventListener("click", closeCoopRequestModal);
coopRequestModal?.addEventListener("click", (event) => {
  if (event.target === coopRequestModal) closeCoopRequestModal();
});
viewCurrentCoopRequestBtn?.addEventListener("click", () => openCoopRequestDetail(currentCoopRequest?.id));
cancelCoopRequestBtn?.addEventListener("click", confirmCancelCoopRequest);
coopRequestHistoryBody?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-request-id]");
  if (button) openCoopRequestDetail(button.dataset.requestId);
});
closeCoopRequestDetailModalBtn?.addEventListener("click", closeCoopRequestDetailModal);
closeCoopRequestDetailFooterBtn?.addEventListener("click", closeCoopRequestDetailModal);
coopRequestDetailModal?.addEventListener("click", (event) => {
  if (event.target === coopRequestDetailModal) closeCoopRequestDetailModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (coopRequestDetailModal?.classList.contains("open")) {
    closeCoopRequestDetailModal();
  } else if (coopRequestModal?.classList.contains("open")) {
    closeCoopRequestModal();
  }
});

// ==============================
// Daily Log Modal
// ==============================

const dailyLogModal =
  document.getElementById(
    "dailyLogModal"
  );

const addDailyLogBtn =
  document.getElementById(
    "addDailyLogBtn"
  );

const closeDailyLogModal =
  document.getElementById(
    "closeDailyLogModal"
  );

const cancelDailyLogBtn =
  document.getElementById(
    "cancelDailyLogBtn"
  );

const saveDailyLogBtn =
  document.getElementById(
    "saveDailyLogBtn"
  );

const dailyDate =
  document.getElementById(
    "dailyDate"
  );

const dailyWork =
  document.getElementById(
    "dailyWork"
  );

const dailyLogTableBody =
  document.getElementById(
    "dailyLogTableBody"
  );

function openDailyModal() {
  dailyLogModal?.classList.add(
    "open"
  );
}

function closeDailyModal() {
  dailyLogModal?.classList.remove(
    "open"
  );
}

addDailyLogBtn?.addEventListener(
  "click",
  openDailyModal
);

closeDailyLogModal?.addEventListener(
  "click",
  closeDailyModal
);

cancelDailyLogBtn?.addEventListener(
  "click",
  closeDailyModal
);

dailyLogModal?.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      dailyLogModal
    ) {
      closeDailyModal();
    }
  }
);

// ==============================
// Daily Log
// ==============================

saveDailyLogBtn?.addEventListener(
  "click",
  () => {
    const dateValue =
      dailyDate?.value || "";

    const workValue =
      dailyWork?.value.trim() ||
      "";

    if (
      !dateValue ||
      !workValue
    ) {
      showToast("กรุณากรอกวันที่และรายละเอียดงาน", "warning");

      return;
    }

    removeEmptyDailyRow();

    const row =
      document.createElement(
        "tr"
      );

    const dateCell =
      document.createElement(
        "td"
      );

    const workCell =
      document.createElement(
        "td"
      );

    const statusCell =
      document.createElement(
        "td"
      );

    const actionCell =
      document.createElement(
        "td"
      );

    dateCell.textContent =
      formatDate(dateValue);

    workCell.textContent =
      workValue;

    statusCell.textContent =
      "ยังไม่ส่ง";

    const deleteButton =
      document.createElement(
        "button"
      );

    deleteButton.type =
      "button";

    deleteButton.className =
      "btn-secondary";

    deleteButton.innerHTML =
      '<i class="fa-solid fa-trash"></i> ลบ';

    deleteButton.addEventListener(
      "click",
      () => {
        row.remove();

        restoreEmptyDailyRow();
      }
    );

    actionCell.appendChild(
      deleteButton
    );

    row.appendChild(
      dateCell
    );

    row.appendChild(
      workCell
    );

    row.appendChild(
      statusCell
    );

    row.appendChild(
      actionCell
    );

    dailyLogTableBody?.appendChild(
      row
    );

    if (dailyDate) {
      dailyDate.value = "";
    }

    if (dailyWork) {
      dailyWork.value = "";
    }

    updateDailyCount();

    closeDailyModal();
  }
);

function removeEmptyDailyRow() {
  const emptyRow =
    dailyLogTableBody?.querySelector(
      ".empty-table-row"
    );

  emptyRow?.remove();
}

function restoreEmptyDailyRow() {
  if (!dailyLogTableBody) {
    return;
  }

  const rows =
    dailyLogTableBody.querySelectorAll(
      "tr:not(.empty-table-row)"
    );

  if (rows.length > 0) {
    updateDailyCount();

    return;
  }

  dailyLogTableBody.innerHTML = `
    <tr class="empty-table-row">
      <td colspan="4">
        ยังไม่มีบันทึกการปฏิบัติงาน
      </td>
    </tr>
  `;

  updateDailyCount();
}

function updateDailyCount() {
  const dailyCount =
    document.getElementById(
      "dailyCount"
    );

  if (
    !dailyCount ||
    !dailyLogTableBody
  ) {
    return;
  }

  const rows =
    dailyLogTableBody.querySelectorAll(
      "tr:not(.empty-table-row)"
    );

  dailyCount.textContent =
    rows.length;
}

function formatDate(dateValue) {
  if (dateValue === null || dateValue === undefined || dateValue === "") return "-";
  const date = new Date(typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? `${dateValue}T00:00:00` : dateValue);
  if (!Number.isFinite(date.getTime())) return "-";

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

// ==============================
// Project and project files
// ==============================
const projectTitle = document.getElementById("projectTitle");
const projectAdvisor = document.getElementById("projectAdvisor");
const projectAdvisorHelp = document.getElementById("projectAdvisorHelp");
const projectAdvisorStatus = document.getElementById("projectAdvisorStatus");
const projectAdvisorMessage = document.getElementById("projectAdvisorMessage");
const saveProjectBtn = document.getElementById("saveProjectBtn");
const projectMessage = document.getElementById("projectMessage");
const projectBookFile = document.getElementById("projectBookFile");
const posterFile = document.getElementById("posterFile");
const uploadProjectBtn = document.getElementById("uploadProjectBtn");
const projectUploadMessage = document.getElementById("projectUploadMessage");
const projectBookCurrent = document.getElementById("projectBookCurrent");
const posterCurrent = document.getElementById("posterCurrent");
let isProjectSaving = false;
let isProjectUploading = false;
let isProjectLoaded = false;
let isAdvisorLoaded = false;
let isAdvisorDirectoryLoaded = false;
let isAdvisorRequestSaving = false;
let projectAdvisorTeachers = [];
let projectAdvisorRequest = { status: "none", teacher: null };
let confirmedProjectAdvisor = null;
const projectPreviewUrls = new Map();

function renderProjectAdvisor() {
  if (!projectAdvisor) return;
  const advisor = confirmedProjectAdvisor || projectAdvisorRequest.teacher;
  const teachers = projectAdvisorTeachers;
  projectAdvisor.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "-- เลือกอาจารย์ --";
  projectAdvisor.appendChild(empty);
  for (const teacher of teachers) {
    const option = document.createElement("option");
    option.value = teacher.id;
    option.textContent = formatTeacherName(teacher);
    projectAdvisor.appendChild(option);
  }
  if (advisor && !teachers.some(teacher => teacher.id === advisor.id)) {
    const current = document.createElement("option");
    current.value = advisor.id;
    current.textContent = advisor.name;
    projectAdvisor.appendChild(current);
  }
  projectAdvisor.value = advisor?.id || "";
  const confirmed = Boolean(confirmedProjectAdvisor) || projectAdvisorRequest.status === "confirmed";
  projectAdvisor.disabled = confirmed || !isAdvisorLoaded || !isAdvisorDirectoryLoaded || isAdvisorRequestSaving;
  if (projectAdvisorStatus) {
    const labels = { none: "ยังไม่ได้เลือกอาจารย์", pending: "รออาจารย์ยืนยัน", confirmed: "อาจารย์ยืนยันแล้ว", rejected: "อาจารย์ปฏิเสธคำขอ" };
    const status = confirmed ? "confirmed" : projectAdvisorRequest.status;
    const colors = { pending: "is-advisor_review", confirmed: "is-approved", rejected: "is-rejected" };
    const badge = document.createElement("span");
    badge.className = `coop-status-badge project-advisor-badge ${colors[status] || ""}`;
    badge.textContent = labels[status] || labels.none;
    projectAdvisorStatus.dataset.status = status;
    projectAdvisorStatus.replaceChildren(badge);
    if (advisor) {
      const selected = document.createElement("span");
      selected.className = "project-advisor-selected";
      selected.textContent = `อาจารย์: ${advisor.name || formatTeacherName(advisor)}`;
      projectAdvisorStatus.appendChild(selected);
    }
    if (status === "rejected" && projectAdvisorRequest.rejection_reason) {
      const reason = document.createElement("span");
      reason.className = "project-advisor-reason";
      reason.textContent = `เหตุผล: ${projectAdvisorRequest.rejection_reason}`;
      projectAdvisorStatus.appendChild(reason);
    }
  }
}

async function loadStudentCoopProjectSections() {
  await Promise.all([loadCoopProject(), loadCoopProjectFiles()]);
  await loadProjectAdvisorRequest();
}

async function loadCoopProject() {
  isProjectLoaded = false;
  if (saveProjectBtn) saveProjectBtn.disabled = true;
  try {
    const project = await getMyCoopProject();
    confirmedProjectAdvisor = project.confirmed_advisor || project.coop_advisor_teacher || null;
    if (projectTitle) projectTitle.value = project.topic || "";
    renderProjectAdvisor();
    isProjectLoaded = true;
    clearMessage(projectMessage);
  } catch (error) {
    showMessage(projectMessage, error.message || "ไม่สามารถโหลดโครงการได้", "error");
  } finally {
    if (saveProjectBtn) saveProjectBtn.disabled = !isProjectLoaded || isProjectSaving;
  }
}

async function loadProjectAdvisorRequest() {
  isAdvisorLoaded = false;
  isAdvisorDirectoryLoaded = false;
  renderProjectAdvisor();
  const [request, directory] = await Promise.allSettled([getMyProjectAdvisorRequest(), getTeachers()]);
  const errors = [];
  if (request.status === "fulfilled" && ["none", "pending", "confirmed", "rejected"].includes(request.value?.advisor_request?.status)) {
    projectAdvisorRequest = request.value.advisor_request;
    confirmedProjectAdvisor = request.value.confirmed_advisor;
    isAdvisorLoaded = true;
  } else errors.push(request.reason?.message || "ไม่สามารถโหลดคำขออาจารย์ได้");
  if (directory.status === "fulfilled" && Array.isArray(directory.value?.teachers)) {
    projectAdvisorTeachers = directory.value.teachers;
    isAdvisorDirectoryLoaded = true;
  } else errors.push("โหลดรายชื่ออาจารย์ไม่สำเร็จ");
  if (projectAdvisorHelp) projectAdvisorHelp.textContent = errors.length ? errors.join(" • ") : "เลือกอาจารย์เพื่อส่งคำขอยืนยัน หัวข้อโครงการบันทึกและแก้ไขได้ทันที";
  renderProjectAdvisor();
  return isAdvisorLoaded && isAdvisorDirectoryLoaded;
}

async function requestProjectAdvisor() {
  if (isAdvisorRequestSaving || !isAdvisorLoaded || !isAdvisorDirectoryLoaded || confirmedProjectAdvisor || projectAdvisorRequest.status === "confirmed") return;
  const teacherId = projectAdvisor?.value;
  if (!teacherId) { renderProjectAdvisor(); return; }
  isAdvisorRequestSaving = true;
  projectAdvisor.disabled = true;
  clearMessage(projectAdvisorMessage);
  try {
    const saved = await requestMyProjectAdvisor(teacherId);
    projectAdvisorRequest = saved.advisor_request;
    confirmedProjectAdvisor = saved.confirmed_advisor;
    await loadProjectAdvisorRequest();
    if (isAdvisorLoaded) {
      showMessage(projectAdvisorMessage, "ส่งคำขออาจารย์ที่ปรึกษาแล้ว", "success");
      showToast("ส่งคำขออาจารย์ที่ปรึกษาแล้ว", "success");
    }
  } catch (error) {
    showMessage(projectAdvisorMessage, error.message || "ไม่สามารถส่งคำขออาจารย์ได้", "error");
    // Reconcile a response lost after commit or a confirmation that raced selection.
    await loadProjectAdvisorRequest();
  } finally {
    isAdvisorRequestSaving = false;
    renderProjectAdvisor();
  }
}
projectAdvisor?.addEventListener("change", requestProjectAdvisor);

async function saveCoopProjectTopic() {
  if (isProjectSaving || !isProjectLoaded) return;
  const topic = projectTitle?.value.trim() || "";
  if (!topic || [...topic].length > 500) {
    showMessage(projectMessage, "กรุณากรอกหัวข้อโครงการไม่เกิน 500 ตัวอักษร", "error");
    return;
  }
  isProjectSaving = true;
  if (projectTitle) projectTitle.disabled = true;
  setButtonLoading(saveProjectBtn, true, "กำลังบันทึก...");
  try {
    const saved = await saveMyCoopProject(topic);
    if (projectTitle) projectTitle.value = saved.topic;
    await loadCoopProject();
    if (isProjectLoaded) {
      showMessage(projectMessage, "บันทึกหัวข้อโครงการสำเร็จ", "success");
      showToast("บันทึกหัวข้อโครงการสำเร็จ", "success");
    }
  } catch (error) {
    showMessage(projectMessage, error.message || "ไม่สามารถบันทึกหัวข้อโครงการได้", "error");
  } finally {
    isProjectSaving = false;
    if (projectTitle) projectTitle.disabled = false;
    setButtonLoading(saveProjectBtn, false);
    if (saveProjectBtn) saveProjectBtn.disabled = !isProjectLoaded;
  }
}
saveProjectBtn?.addEventListener("click", saveCoopProjectTopic);

function renderCurrentProjectFile(container, file) {
  if (!container) return;
  container.replaceChildren();
  container.dataset.hasFile = String(Boolean(file));
  if (!file) { container.textContent = "ยังไม่มีไฟล์ที่อัปโหลด"; return; }
  const label = document.createElement("div");
  label.className = "project-file-meta";
  const name = document.createElement("span");
  name.className = "project-file-name";
  name.textContent = file.original_name;
  const date = document.createElement("span");
  date.className = "project-file-date";
  const formattedDate = formatDate(file.updated_at);
  date.textContent = formattedDate === "-" ? "ไม่ระบุวันที่" : `อัปเดต ${formattedDate}`;
  label.appendChild(name);
  label.appendChild(date);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-secondary project-file-preview";
  button.textContent = "เปิดดู";
  button.setAttribute("aria-label", `เปิดดู ${file.original_name}`);
  button.addEventListener("click", () => openProjectFilePreview(file, button));
  container.appendChild(label);
  container.appendChild(button);
}

async function loadCoopProjectFiles() {
  try {
    const result = await getMyCoopProjectFiles();
    if (!Array.isArray(result?.files)) throw new Error("ไม่สามารถโหลดไฟล์โครงการได้");
    renderCurrentProjectFile(projectBookCurrent, result.files.find(file => file.file_type === "coop_project_book"));
    renderCurrentProjectFile(posterCurrent, result.files.find(file => file.file_type === "coop_poster"));
    return true;
  } catch (error) {
    showMessage(projectUploadMessage, error.message || "ไม่สามารถโหลดไฟล์โครงการได้", "error");
    return false;
  }
}

function validateProjectUpload(file, category) {
  const types = category === "project-book" ? { "application/pdf": ["pdf"] } : { "application/pdf": ["pdf"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"] };
  const extension = file.name.split(".").pop().toLowerCase();
  if (!types[file.type]?.includes(extension) || file.size < 1 || file.size > 10 * 1024 * 1024 || /[\\/\u0000-\u001f]/.test(file.name) || file.name.includes("..")) {
    throw new Error(category === "project-book" ? "เล่มโครงการต้องเป็น PDF ขนาดไม่เกิน 10MB" : "โปสเตอร์ต้องเป็น PDF, PNG หรือ JPEG ขนาดไม่เกิน 10MB");
  }
}

async function uploadCoopProjectFiles() {
  if (isProjectUploading) return;
  const selected = [["project-book", projectBookFile], ["poster", posterFile]].filter(([, input]) => input?.files?.[0]);
  try {
    if (!selected.length) throw new Error("กรุณาเลือกไฟล์ที่ต้องการอัปโหลด");
    for (const [category, input] of selected) validateProjectUpload(input.files[0], category);
  } catch (error) { showMessage(projectUploadMessage, error.message, "error"); return; }
  isProjectUploading = true;
  setButtonLoading(uploadProjectBtn, true, "กำลังอัปโหลด...");
  for (const [, input] of selected) input.disabled = true;
  clearMessage(projectUploadMessage);
  try {
    // Independent categories: a successful Book is retained if Poster fails.
    for (const [category, input] of selected) {
      await uploadMyCoopProjectFile(category, input.files[0]);
      input.value = "";
    }
    if (await loadCoopProjectFiles()) {
      showMessage(projectUploadMessage, "อัปโหลดไฟล์โครงการสำเร็จ", "success");
      showToast("อัปโหลดไฟล์โครงการสำเร็จ", "success");
    }
  } catch (error) {
    await loadCoopProjectFiles();
    showMessage(projectUploadMessage, error.message || "ไม่สามารถอัปโหลดไฟล์ได้", "error");
  } finally {
    isProjectUploading = false;
    setButtonLoading(uploadProjectBtn, false);
    for (const [, input] of selected) input.disabled = false;
  }
}
uploadProjectBtn?.addEventListener("click", uploadCoopProjectFiles);

async function openProjectFilePreview(file, button) {
  if (button.disabled) return;
  // Reserve the tab inside the click gesture before awaiting authenticated Blob fetch.
  const tab = window.open("", "_blank");
  if (!tab) { showMessage(projectUploadMessage, "กรุณาอนุญาตเปิดแท็บใหม่เพื่อดูไฟล์", "error"); return; }
  tab.opener = null;
  setButtonLoading(button, true, "กำลังเปิด...");
  let objectUrl;
  try {
    const blob = await previewMyCoopProjectFile(file.id);
    if (!["application/pdf", "image/png", "image/jpeg"].includes(blob.type)) throw new Error("ประเภทไฟล์ไม่รองรับการเปิดดู");
    if (tab.closed) return;
    objectUrl = URL.createObjectURL(blob);
    tab.location.replace(objectUrl);
    const timer = setInterval(() => {
      if (tab.closed) { URL.revokeObjectURL(objectUrl); clearInterval(timer); projectPreviewUrls.delete(objectUrl); }
    }, 1000);
    projectPreviewUrls.set(objectUrl, timer);
  } catch (error) {
    tab.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    showMessage(projectUploadMessage, error.message || "ไม่สามารถเปิดไฟล์ได้", "error");
  } finally { setButtonLoading(button, false); }
}
window.addEventListener("pagehide", () => {
  for (const [url, timer] of projectPreviewUrls) { clearInterval(timer); URL.revokeObjectURL(url); }
  projectPreviewUrls.clear();
});

// ==============================
// Mentor
// ==============================

const mentorEmail = document.getElementById("mentorEmail");
const mentorFirstName = document.getElementById("mentorFirstName");
const mentorLastName = document.getElementById("mentorLastName");
const mentorPosition = document.getElementById("mentorPosition");
const mentorVerificationStatusItem = document.getElementById("mentorVerificationStatusItem");
const mentorVerificationStatus = document.getElementById("mentorVerificationStatus");
const mentorVerificationStatusLabel = document.getElementById("mentorVerificationStatusLabel");
const mentorVerificationHint = document.getElementById("mentorVerificationHint");
const btnResendMentorVerification = document.getElementById("btnResendMentorVerification");
const mentorResendButtonLabel = document.getElementById("mentorResendButtonLabel");
const mentorMessage = document.getElementById("mentorMessage");
const btnAddMentor = document.getElementById("btnAddMentor");
const btnEditMentor = document.getElementById("btnEditMentor");
const btnDeleteMentor = document.getElementById("btnDeleteMentor");
const mentorModal = document.getElementById("mentorModal");
const mentorModalTitle = document.getElementById("mentorModalTitle");
const mentorModalDescription = document.getElementById("mentorModalDescription");
const closeMentorModalBtn = document.getElementById("closeMentorModal");
const cancelMentorModalBtn = document.getElementById("cancelMentorModal");
const mentorForm = document.getElementById("mentorForm");
const mentorFormMessage = document.getElementById("mentorFormMessage");
const saveMentorBtn = document.getElementById("saveMentorBtn");
const mentorFormEmail = document.getElementById("mentorFormEmail");
const mentorFormFirstName = document.getElementById("mentorFormFirstName");
const mentorFormLastName = document.getElementById("mentorFormLastName");
const mentorFormPosition = document.getElementById("mentorFormPosition");

let currentMentor = null;
let mentorLoading = false;
let mentorSubmitting = false;
let mentorDeleting = false;
let mentorResending = false;
let mentorFormMode = "create";

function renderMentor() {
  setText(mentorEmail, currentMentor?.email || "-");
  setText(mentorFirstName, currentMentor?.first_name || "-");
  setText(mentorLastName, currentMentor?.last_name || "-");
  setText(mentorPosition, currentMentor?.position || "-");

  const isPending = currentMentor?.status === "pending";
  const isVerified = currentMentor?.status === "verified";
  const shouldShowPendingActions = Boolean(currentMentor) && isPending;
  const isBusy = mentorLoading || mentorSubmitting || mentorDeleting || mentorResending;

  if (mentorVerificationStatusItem) {
    mentorVerificationStatusItem.hidden = !currentMentor;
  }

  if (mentorVerificationStatus && mentorVerificationStatusLabel) {
    const statusClass = isPending
      ? "is-pending"
      : isVerified
        ? "is-verified"
        : "is-unknown";
    const statusIcon = isPending
      ? "fa-clock"
      : isVerified
        ? "fa-circle-check"
        : "fa-circle-question";
    const statusLabel = isPending
      ? "รอยืนยัน"
      : isVerified
        ? "ยืนยันแล้ว"
        : "ไม่ทราบสถานะ";

    mentorVerificationStatus.className = `mentor-status-badge ${statusClass}`;
    const statusIconElement = mentorVerificationStatus.querySelector("i");
    if (statusIconElement) {
      statusIconElement.className = `fa-solid ${statusIcon}`;
    }
    mentorVerificationStatusLabel.textContent = statusLabel;
  }

  if (mentorVerificationHint) {
    mentorVerificationHint.hidden = !shouldShowPendingActions;
    mentorVerificationHint.textContent = shouldShowPendingActions
      ? "พี่เลี้ยงยังไม่ได้ยืนยันข้อมูล"
      : "";
  }

  if (btnResendMentorVerification) {
    btnResendMentorVerification.hidden = !shouldShowPendingActions;
    btnResendMentorVerification.disabled = isBusy;
  }

  if (mentorResendButtonLabel) {
    mentorResendButtonLabel.textContent = mentorResending
      ? "กำลังส่ง..."
      : "ส่งอีเมลยืนยันอีกครั้ง";
  }

  if (btnAddMentor) {
    btnAddMentor.disabled = isBusy || Boolean(currentMentor);
  }

  if (btnEditMentor) {
    btnEditMentor.disabled = isBusy || !currentMentor;
  }

  if (btnDeleteMentor) {
    btnDeleteMentor.disabled = isBusy || !currentMentor;
  }
}

function getMentorErrorMessage(error, action) {
  if (!error?.status) {
    return "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง";
  }

  const messages = {
    400: "ข้อมูลพี่เลี้ยงไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
    401: "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    404: "ไม่พบข้อมูลพี่เลี้ยง กรุณารีเฟรชข้อมูลแล้วลองใหม่อีกครั้ง",
    409: "มีข้อมูลพี่เลี้ยงอยู่แล้ว กรุณารีเฟรชข้อมูล",
    422: "ข้อมูลพี่เลี้ยงไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
    500: `ไม่สามารถ${action}ข้อมูลพี่เลี้ยงได้ กรุณาลองใหม่อีกครั้ง`,
  };

  return messages[error.status] || `ไม่สามารถ${action}ข้อมูลพี่เลี้ยงได้ กรุณาลองใหม่อีกครั้ง`;
}

async function loadMentor() {
  if (mentorLoading || mentorSubmitting || mentorDeleting || mentorResending) {
    return false;
  }

  mentorLoading = true;
  renderMentor();
  showMessage(mentorMessage, "กำลังโหลดข้อมูลพี่เลี้ยง...", "loading");

  try {
    const result = await getMyMentor();
    currentMentor = result?.data || null;
    renderMentor();

    if (currentMentor) {
      clearMessage(mentorMessage);
    } else {
      showMessage(mentorMessage, "ยังไม่มีข้อมูลพี่เลี้ยง กรุณาเพิ่มข้อมูลเพื่อดำเนินการต่อ", "info");
    }

    return true;
  } catch (error) {
    currentMentor = null;
    renderMentor();
    showMessage(mentorMessage, getMentorErrorMessage(error, "โหลด"), "error");
    return false;
  } finally {
    mentorLoading = false;
    renderMentor();
  }
}

function setMentorFormSubmitting(isSubmitting) {
  const controls = mentorForm?.querySelectorAll("input, button");
  controls?.forEach((element) => {
    element.disabled = isSubmitting;
  });

  const label = saveMentorBtn?.querySelector("span");
  if (label) {
    label.textContent = isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล";
  }
}

function openMentorModal(mode) {
  if (mentorSubmitting || (mode === "edit" && !currentMentor)) {
    return;
  }

  mentorFormMode = mode;
  const isEdit = mode === "edit";
  const mentor = currentMentor || {};

  mentorModalTitle.textContent = isEdit ? "แก้ไขข้อมูลพี่เลี้ยง" : "เพิ่มข้อมูลพี่เลี้ยง";
  mentorModalDescription.textContent = isEdit
    ? "แก้ไขข้อมูลติดต่อพี่เลี้ยงและบันทึกเพื่อส่งยืนยันข้อมูลใหม่"
    : "กรอกข้อมูลสำหรับติดต่อพี่เลี้ยงสหกิจศึกษา";
  mentorFormEmail.value = isEdit ? mentor.email || "" : "";
  mentorFormFirstName.value = isEdit ? mentor.first_name || "" : "";
  mentorFormLastName.value = isEdit ? mentor.last_name || "" : "";
  mentorFormPosition.value = isEdit ? mentor.position || "" : "";
  clearMessage(mentorFormMessage);
  setMentorFormSubmitting(false);
  mentorModal?.classList.add("open");
  mentorModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  mentorFormEmail?.focus();
}

function closeMentorModal() {
  if (mentorSubmitting) {
    return;
  }

  mentorModal?.classList.remove("open");
  mentorModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function getMentorFormData() {
  return {
    email: mentorFormEmail.value.trim(),
    first_name: mentorFormFirstName.value.trim(),
    last_name: mentorFormLastName.value.trim(),
    position: mentorFormPosition.value.trim(),
  };
}

function validateMentorForm(data) {
  if (!data.email || !data.first_name || !data.last_name || !data.position) {
    return "กรุณากรอกข้อมูลพี่เลี้ยงให้ครบถ้วน";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "กรุณากรอกอีเมลให้ถูกต้อง";
  }

  return null;
}

async function submitMentorForm(event) {
  event.preventDefault();
  if (mentorSubmitting) {
    return;
  }

  const data = getMentorFormData();
  const validationError = validateMentorForm(data);
  if (validationError) {
    showMessage(mentorFormMessage, validationError, "error");
    return;
  }

  mentorSubmitting = true;
  setMentorFormSubmitting(true);
  renderMentor();
  clearMessage(mentorFormMessage);
  showMessage(mentorMessage, "กำลังบันทึกข้อมูลพี่เลี้ยง...", "loading");

  try {
    if (mentorFormMode === "edit") {
      await updateMyMentor(data);
    } else {
      await createMentor(data);
    }

    mentorSubmitting = false;
    closeMentorModal();
    const wasLoaded = await loadMentor();
    if (wasLoaded) {
      showMessage(
        mentorMessage,
        mentorFormMode === "edit" ? "แก้ไขข้อมูลพี่เลี้ยงสำเร็จ" : "บันทึกข้อมูลพี่เลี้ยงสำเร็จ",
        "success"
      );
      showToast(
        mentorFormMode === "edit" ? "แก้ไขข้อมูลพี่เลี้ยงสำเร็จ" : "บันทึกข้อมูลพี่เลี้ยงสำเร็จ",
        "success"
      );
    }
  } catch (error) {
    showMessage(
      mentorFormMessage,
      getMentorErrorMessage(error, mentorFormMode === "edit" ? "แก้ไข" : "บันทึก"),
      "error"
    );
  } finally {
    mentorSubmitting = false;
    setMentorFormSubmitting(false);
    renderMentor();
  }
}

async function deleteMentorAfterConfirmation() {
  if (!currentMentor || mentorDeleting || mentorSubmitting || mentorResending) {
    return;
  }

  mentorDeleting = true;
  renderMentor();
  showMessage(mentorMessage, "กำลังลบข้อมูลพี่เลี้ยง...", "loading");

  try {
    await deleteMyMentor();
    currentMentor = null;
    renderMentor();
    showMessage(mentorMessage, "ลบข้อมูลพี่เลี้ยงสำเร็จ", "success");
    showToast("ลบข้อมูลพี่เลี้ยงสำเร็จ", "success");
  } catch (error) {
    showMessage(mentorMessage, getMentorErrorMessage(error, "ลบ"), "error");
  } finally {
    mentorDeleting = false;
    renderMentor();
  }
}

function removeMentor() {
  if (!currentMentor || mentorDeleting || mentorSubmitting || mentorResending) {
    return;
  }

  showConfirmModal({
    title: "ลบข้อมูลพี่เลี้ยง",
    message: "คุณต้องการลบข้อมูลพี่เลี้ยงใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้",
    confirmLabel: "ลบข้อมูล",
    loadingLabel: "กำลังลบ...",
    onConfirm: deleteMentorAfterConfirmation,
  });
}

async function resendMentorVerificationAfterConfirmation() {
  if (
    currentMentor?.status !== "pending" ||
    mentorResending ||
    mentorSubmitting ||
    mentorDeleting
  ) {
    return;
  }

  mentorResending = true;
  renderMentor();
  showMessage(mentorMessage, "กำลังส่งอีเมลยืนยัน...", "loading");

  try {
    const result = await updateMyMentor({
      email: currentMentor.email,
      first_name: currentMentor.first_name,
      last_name: currentMentor.last_name,
      position: currentMentor.position,
    });
    const verificationEmailSent = result?.data?.verification_email_sent;

    mentorResending = false;
    const wasLoaded = await loadMentor();
    if (!wasLoaded) {
      return;
    }

    showMessage(
      mentorMessage,
      verificationEmailSent === false
        ? "บันทึกข้อมูลแล้ว แต่ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองใหม่อีกครั้ง"
        : "ส่งอีเมลยืนยันอีกครั้งเรียบร้อยแล้ว",
      verificationEmailSent === false ? "error" : "success"
    );
    if (verificationEmailSent !== false) {
      showToast("ส่งอีเมลยืนยันอีกครั้งเรียบร้อยแล้ว", "success");
    }
  } catch (error) {
    showMessage(mentorMessage, getMentorErrorMessage(error, "ส่งอีเมลยืนยัน"), "error");
  } finally {
    mentorResending = false;
    renderMentor();
  }
}

function resendMentorVerification() {
  if (
    currentMentor?.status !== "pending" ||
    mentorResending ||
    mentorSubmitting ||
    mentorDeleting
  ) {
    return;
  }

  showConfirmModal({
    title: "ส่งอีเมลยืนยันอีกครั้ง",
    message: "ต้องการส่งอีเมลยืนยันไปยังพี่เลี้ยงอีกครั้งหรือไม่?",
    confirmLabel: "ส่งอีเมล",
    loadingLabel: "กำลังส่ง...",
    onConfirm: resendMentorVerificationAfterConfirmation,
  });
}

btnAddMentor?.addEventListener("click", () => openMentorModal("create"));
btnEditMentor?.addEventListener("click", () => openMentorModal("edit"));
btnDeleteMentor?.addEventListener("click", removeMentor);
btnResendMentorVerification?.addEventListener("click", resendMentorVerification);
mentorForm?.addEventListener("submit", submitMentorForm);
closeMentorModalBtn?.addEventListener("click", closeMentorModal);
cancelMentorModalBtn?.addEventListener("click", closeMentorModal);
mentorModal?.addEventListener("click", (event) => {
  if (event.target === mentorModal) {
    closeMentorModal();
  }
});

// ==============================
// Transfer
// ==============================

const transferReason =
  document.getElementById(
    "transferReason"
  );

const submitTransferBtn =
  document.getElementById(
    "submitTransferBtn"
  );

const transferMessage =
  document.getElementById(
    "transferMessage"
  );

submitTransferBtn?.addEventListener(
  "click",
  () => {
    clearMessage(
      transferMessage
    );

    const reason =
      transferReason?.value.trim() ||
      "";

    if (!reason) {
      showMessage(
        transferMessage,
        "กรุณากรอกเหตุผลในการขอย้ายสถานประกอบการ",
        "error"
      );

      return;
    }

    showMessage(
      transferMessage,
      "ระบบขอย้ายสถานประกอบการยังไม่ได้เชื่อมต่อ Backend",
      "success"
    );
  }
);

// ==============================
// Message Helper
// ==============================

function showMessage(
  element,
  message,
  type
) {
  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.className =
    `message ${type}`;
}

function clearMessage(
  element
) {
  if (!element) {
    return;
  }

  element.textContent = "";

  element.className =
    "message";
}

// ==============================
// Initial
// ==============================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    renderMentor();
    checkAuthentication();

    updateDailyCount();
  }
);
