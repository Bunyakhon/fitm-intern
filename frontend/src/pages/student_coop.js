console.log("KIWI student cooperative dashboard loaded");

const API_URL = "http://localhost:5000";

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
// Authentication
// ==============================

async function checkAuthentication() {
  const token = localStorage.getItem("token");

  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/auth/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
        "ไม่สามารถตรวจสอบผู้ใช้งานได้"
      );
    }

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
    await loadStudentProfile(token);
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

async function loadStudentProfile(token) {
  try {
    const response = await fetch(
      `${API_URL}/api/student-profile`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
        "ไม่สามารถโหลดข้อมูลประวัตินักศึกษาได้"
      );
    }

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

    // แสดงข้อมูลจาก student_profiles
    renderStudentProfile(
      result.student.profile
    );

    return result.student;
  } catch (error) {
    console.error(
      "LOAD STUDENT PROFILE ERROR:",
      error
    );

    return null;
  }
}

// ==============================
// Render Student
// ==============================

function renderStudent(student) {
  const firstName =
    student.first_name || "";

  const lastName =
    student.last_name || "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    "-";

  const studentId =
    student.student_id || "-";

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

    alert(
      "หน้าค้นหาสถานประกอบการจะพัฒนาในขั้นตอนถัดไป"
    );
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
    alert(
      "ระบบสร้างคำร้องสหกิจศึกษาจะพัฒนาในขั้นตอนถัดไป"
    );
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
      alert(
        "กรุณากรอกวันที่และรายละเอียดงาน"
      );

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

const addMentorBtn =
  document.getElementById(
    "addMentorBtn"
  );

addMentorBtn?.addEventListener(
  "click",
  () => {
    alert(
      "ระบบเพิ่มข้อมูลพี่เลี้ยงจะพัฒนาในขั้นตอนถัดไป"
    );
  }
);

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
    checkAuthentication();

    updateDailyCount();
  }
);