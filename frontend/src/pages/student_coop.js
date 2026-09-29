import { getCurrentStudent } from "../api/auth.api.js";
import {
  getMyStudentProfile,
  getStudentProfileImage,
  updateMyStudentProfile,
  updateStudentInfo,
  uploadStudentProfileImage,
} from "../api/studentProfile.api.js";
import { getTeachers } from "../api/teacher.api.js";
import {
  createMentor,
  deleteMyMentor,
  getMyMentor,
  updateMyMentor,
} from "../api/mentor.api.js";
import { showConfirmModal, showToast } from "../ui/feedback.js";

console.log("KIWI student cooperative dashboard loaded");

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

    console.log(
      "Student profile loaded:",
      result.student
    );

    // แสดงข้อมูลพื้นฐานจาก students อีกครั้ง
    renderStudent(result.student);

    currentStudent = result.student;
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
    studentAdvisorInput.value = student.advisor_teacher_id || "";
  }
}

function setInputElementValue(element, value) {
  if (element) {
    element.value = value ?? "";
  }
}

async function loadTeachers(selectedTeacherId = currentStudent?.advisor_teacher_id) {
  if (!studentAdvisorInput) {
    return;
  }

  studentAdvisorInput.disabled = true;
  studentAdvisorInput.setAttribute("aria-busy", "true");
  studentAdvisorInput.replaceChildren();
  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "กำลังโหลดรายชื่ออาจารย์...";
  studentAdvisorInput.appendChild(loadingOption);

  try {
    const result = await getTeachers();

    studentAdvisorInput.replaceChildren();
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "ยังไม่ได้กำหนด";
    studentAdvisorInput.appendChild(emptyOption);

    const teachers = Array.isArray(result.teachers) ? result.teachers : [];
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

    studentAdvisorInput.value = selectedTeacherId || "";
  } catch (error) {
    console.error("LOAD TEACHERS ERROR:", error);

    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }

    showMessage(studentInfoMessage, error.message || "ไม่สามารถโหลดรายชื่ออาจารย์ได้", "error");
  } finally {
    studentAdvisorInput.disabled = false;
    studentAdvisorInput.setAttribute("aria-busy", "false");
  }
}

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
    advisor_teacher_id: studentAdvisorInput?.value || null,
  };

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

        sidebarItems.forEach(
          (sidebarItem) => {
            sidebarItem.classList.remove(
              "active"
            );
          }
        );

        contentPanels.forEach(
          (panel) => {
            panel.classList.remove(
              "active"
            );
          }
        );

        item.classList.add(
          "active"
        );

        const targetPanel =
          document.getElementById(
            targetId
          );

        targetPanel?.classList.add(
          "active"
        );

        if (targetId === "panel-mentor") {
          loadMentor();
        }

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    );
  }
);

// ==============================
// Search Company
// ==============================

const searchCompanyLink =
  document.getElementById(
    "searchCompanyLink"
  );

searchCompanyLink?.addEventListener(
  "click",
  (event) => {
    event.preventDefault();

    showToast("หน้าค้นหาสถานประกอบการจะพัฒนาในขั้นตอนถัดไป", "info");
  }
);

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

uploadResumeBtn?.addEventListener(
  "click",
  () => {
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

    if (
      file.type !==
      "application/pdf"
    ) {
      showMessage(
        resumeMessage,
        "กรุณาเลือกไฟล์ PDF เท่านั้น",
        "error"
      );

      return;
    }

    showMessage(
      resumeMessage,
      "ส่วนอัปโหลดเรซูเม่ยังไม่ได้เชื่อมต่อ Backend",
      "success"
    );
  }
);

// ==============================
// Request
// ==============================

const createRequestBtn =
  document.getElementById(
    "createRequestBtn"
  );

createRequestBtn?.addEventListener(
  "click",
  () => {
    showToast("ระบบสร้างคำร้องสหกิจศึกษาจะพัฒนาในขั้นตอนถัดไป", "info");
  }
);

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
  const date =
    new Date(
      `${dateValue}T00:00:00`
    );

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
// Project
// ==============================

const projectTitle =
  document.getElementById(
    "projectTitle"
  );

const projectAdvisor =
  document.getElementById(
    "projectAdvisor"
  );

const saveProjectBtn =
  document.getElementById(
    "saveProjectBtn"
  );

const projectMessage =
  document.getElementById(
    "projectMessage"
  );

saveProjectBtn?.addEventListener(
  "click",
  () => {
    clearMessage(
      projectMessage
    );

    const title =
      projectTitle?.value.trim() ||
      "";

    if (!title) {
      showMessage(
        projectMessage,
        "กรุณากรอกหัวข้อโครงการ",
        "error"
      );

      return;
    }

    if (
      !projectAdvisor?.value
    ) {
      showMessage(
        projectMessage,
        "ยังไม่มีข้อมูลอาจารย์ที่ปรึกษาโครงการ",
        "error"
      );

      return;
    }

    showMessage(
      projectMessage,
      "ข้อมูลส่วนโครงการยังไม่ได้เชื่อมต่อ Backend",
      "success"
    );
  }
);

// ==============================
// Project Upload
// ==============================

const projectBookFile =
  document.getElementById(
    "projectBookFile"
  );

const posterFile =
  document.getElementById(
    "posterFile"
  );

const uploadProjectBtn =
  document.getElementById(
    "uploadProjectBtn"
  );

const projectUploadMessage =
  document.getElementById(
    "projectUploadMessage"
  );

uploadProjectBtn?.addEventListener(
  "click",
  () => {
    clearMessage(
      projectUploadMessage
    );

    if (
      !projectBookFile?.files?.[0] &&
      !posterFile?.files?.[0]
    ) {
      showMessage(
        projectUploadMessage,
        "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด",
        "error"
      );

      return;
    }

    showMessage(
      projectUploadMessage,
      "ระบบอัปโหลดโครงการยังไม่ได้เชื่อมต่อ Backend",
      "success"
    );
  }
);

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
