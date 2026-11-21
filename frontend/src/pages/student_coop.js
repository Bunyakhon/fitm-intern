import { revealNavigationItem } from "../ui/navigationScroll.js";
import { createMentorStatusSync } from "./studentMentorSync.js";
import { mountTopicExams } from './coopTopicExams.js';
import { studentTopicExamView } from './studentCoopProjectView.js';
import { mountStudentProjectLinks } from './studentProjectLinks.js';
import { supportsStudentDashboard, canUseCoopFeatures, canOpenStudentPanel, applyStudentDashboardAccess } from "./studentDashboardAccess.js";
import { mountStudentOverview } from "./studentOverview.js";
import { renderProfileAdvisors } from "./studentProfileAdvisors.js";
import { mountCoopActivities } from "./coopActivities.js";
import { mountStudentGoogleAccount } from "./studentGoogleAccount.js";
import { renderAccountProfile, accountProfileState } from "./studentAccountOverview.js";
import { MAX_PERSON_NAME_LENGTH, isThaiPersonName } from "../validators/personName.js";
import { initStudentInternshipLog } from "./studentInternshipLog.js";
import { initStudentSupervision } from "./studentSupervision.js";
import { StudentProfileDraft, readProfileInputs, writeProfileInputs, PROFILE_INPUTS } from "./studentProfileDraft.js";
import { mountStudentProfileWorkspace } from "./studentProfileWorkspace.js";
import { mountStudentProfilePdfImport } from "./studentProfilePdfImport.js";
import { profileMessage, profileFieldError, clearProfileFieldError, clearProfileErrors, notifyProfileChange, profileModalFocus } from "./studentProfileFeedback.js";
import { getCurrentStudent } from "../api/auth.api.js";
import { getStudentToken, clearStudentSession, updateStoredStudent, subscribeStudentSession } from "../auth/studentAuthStorage.js";
import { getMyJobMatches, getMyJobMatchingSource, getPublishedJobs } from "../api/jobMatching.api.js";
import { createJobCard, renderMatchingAnalysis } from "./studentJobRecommendations.js";
import { addressOptions } from "./studentProfileAddress.js";
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
import { getMyCoopProject, saveMyCoopProject, getMyProjectAdvisorRequest, getProjectAdvisorTeachers, requestMyProjectAdvisor, getMyCoopProjectFiles, uploadMyCoopProjectFile, previewMyCoopProjectFile } from "../api/studentCoop.api.js";
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
  getCoopPrerequisiteCatalog,
  getMyCoopRequests,
  getClassAdvisorReadiness,
  getDepartmentHead,
} from "../api/coopRequest.api.js";
import { setButtonLoading, showActionModal, showConfirmModal, showToast } from "../ui/feedback.js";
import { academicSummaryNode, mountAcademicCourses } from './coopAcademicCourses.js';
import '../styles/coop_academic.css';

console.log("KIWI student cooperative dashboard loaded");

const companyEvaluation = initCompanyEvaluation({ document, getEvaluation: getMyCompanyEvaluation, saveEvaluation: saveMyCompanyEvaluation, showToast, setButtonLoading, formatDate });
const topicExams = mountTopicExams({ document, container: document.getElementById('co09Student'), view: studentTopicExamView });
const studentOverview = mountStudentOverview({ document, list: getMyCoopRequests, getToken: getStudentToken, statusLabel: value => getCoopRequestStatusMeta(value).label, formatDate });

// ==============================
// Elements
// ==============================

const userNameDisplay =
  document.getElementById("userNameDisplay");

const overviewGreeting =
  document.getElementById("overviewGreeting");

const logoutBtn =
  document.getElementById("logoutBtn");
let studentLogoutInProgress = false;
let studentLogoutCompleted = false;
let studentLogoutConfirmationOpen = false;

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
let studentProfileRevision = null;
let studentInfoRevision = null;
let hasLoadedStudentProfile = false;
let studentProfileDraft = null;
let studentProfileLoadSequence = 0;
let currentStudent = null;
let selectedProfileImageFile = null;
let selectedProfileImageRevision = null;
let profileImageObjectUrl = null;

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
const studentFirstNameInput = document.getElementById("studentFirstNameInput");
const studentLastNameInput = document.getElementById("studentLastNameInput");
const studentIdInput = document.getElementById("studentIdInput");
const studentEmailInput = document.getElementById("studentEmailInput");
const studentMajorInput = document.getElementById("studentMajorInput");
const studentYearLevelInput = document.getElementById("studentYearLevelInput");
const studentGpaInput = document.getElementById("studentGpaInput");
const studentAdvisorInput = document.getElementById("studentAdvisorInput");
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
let studentGoogleAccount;
let coopWidgetsInitialized = false;

// ==============================
// Authentication
// ==============================

async function checkAuthentication() {
  if (studentLogoutCompleted) { redirectToLogin(); return; }
  const token = getStudentToken();
  studentOverview.clear();
  let authenticated = false;

  if (!token) {
    revokeStudentProjectSession();
    redirectToLogin();
    return;
  }

  try {
    const result = await getCurrentStudent();
    if (getStudentToken() !== token) { handleStudentSessionChange(); return; }

    if (!result.data) {
      throw new Error(
        "ไม่พบข้อมูลนักศึกษา"
      );
    }

    const student = result.data;

    // Admit only Co-op after live backend verification; shared workflows stay intact.
    if (!supportsStudentDashboard(student)) {

      clearAuthentication();

      window.location.href =
        "/login.html";

      return;
    }

    updateStoredStudent(student, token);
    authenticated = true;

    // แสดงข้อมูลจาก students
    renderStudent(student);
    applyStudentDashboardAccess(document, student);
    studentOverview.load(student);
    if (!canOpenStudentPanel(student, document.querySelector(".content-panel.active")?.id)) activateDashboardPanel("panel-overview");
    studentGoogleAccount ||= mountStudentGoogleAccount({ document });
    if (document.getElementById("panel-google-account")?.classList.contains("active")) studentGoogleAccount?.load();

    // โหลดข้อมูลเพิ่มเติมจาก student_profiles
    const studentProfile = await loadStudentProfile();
    await loadTeachers(studentProfile?.advisor_teacher_id);
    if (studentLogoutCompleted || getStudentToken() !== token) return;
    if (canUseCoopFeatures(student)) {
      if (!startStudentProjectSession(token)) return;
      if (!coopWidgetsInitialized) {
        coopWidgetsInitialized = true;
        initStudentInternshipLog();
        initStudentSupervision();
      }
      await loadStudentCoopProjectSections();
    }
  } catch (error) {
    if (getStudentToken() !== token) { handleStudentSessionChange(); return; }
    if (error.status === 401 || (!authenticated && [403, 404].includes(error.status))) {
      revokeStudentProjectSession();
      clearStudentSession({ expectedToken: token });
      redirectToLogin();
      return;
    }
    // Offline/timeout/5xx cannot prove the session invalid. Keep credentials and
    // drafts; do not render the cached account before backend verification.
    showActionModal({ title: authenticated ? "ยังโหลดข้อมูลไม่ครบ" : "ยังตรวจสอบการเข้าสู่ระบบไม่ได้", message: "การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง", actionLabel: "ลองอีกครั้ง", onAction: checkAuthentication });
  }
}

// ==============================
// Load Student Profile
// ==============================

async function loadStudentProfile() {
  const loadSequence = typeof studentProfileLoadSequence === "number" ? ++studentProfileLoadSequence : null;
  setProfileLoading(true);
  profilePanel.dataset.loadState = "loading";
  accountProfileState(document, "loading");
  showMessage(profileLoadMessage, "กำลังโหลดข้อมูลประวัตินักศึกษา...", "loading");

  try {
    const result = await getMyStudentProfile();
    if (loadSequence !== null && loadSequence !== studentProfileLoadSequence) return null;

    if (!result.student) {
      throw new Error(
        "ไม่พบข้อมูลประวัตินักศึกษา"
      );
    }

    // Capture against the previous snapshot before renderStudent changes it.
    const academicDraft = typeof captureStudentInfoDraft === "function" ? captureStudentInfoDraft() : null;
    // แสดงข้อมูลพื้นฐานจาก students อีกครั้ง
    renderStudent(result.student);

    // Capture at response time so edits made during the request are also retained.
    currentStudent = result.student;
    syncCoopPrerequisiteProgram();
    populateStudentInfoForm(result.student);
    if (typeof restoreStudentInfoDraft === "function") restoreStudentInfoDraft(academicDraft);

    // เก็บข้อมูล student_profiles ปัจจุบัน
    currentStudentProfile =
      result.student.profile || null;
    studentProfileRevision = result.profile_revision || null;
    if (typeof studentInfoRevision !== "undefined" && !academicDraft) studentInfoRevision = studentProfileRevision;
    hasLoadedStudentProfile = Boolean(studentProfileRevision);
    if (typeof profileWorkspace !== "undefined") profileWorkspace?.acceptSnapshot(result);
    if (typeof studentProfileDraft !== "undefined" && studentProfileDraft
      && !studentProfileDraft.hasChanges(readProfileInputs(document))) {
      fillProfileEditForm(currentStudentProfile);
      studentProfileDraft = new StudentProfileDraft(readProfileInputs(document), studentProfileRevision);
    }

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

    profilePanel.dataset.loadState = "ready";
    await loadProfileImage(Boolean(result.student.profile_image));

    return result.student;
  } catch (error) {
    console.error(
      "LOAD STUDENT PROFILE ERROR:",
      profileRequestDiagnostic(error)
    );

    if (loadSequence !== null && loadSequence !== studentProfileLoadSequence) return null;
    // A failed refresh must not turn an existing profile/draft into an empty form.
    accountProfileState(document, "error");
    profilePanel.dataset.loadState = "error";

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
    if (loadSequence === null || loadSequence === studentProfileLoadSequence) setProfileLoading(false);
  }
}

function setProfileLoading(isLoading) {
  profilePanel?.classList.toggle("is-loading", isLoading);
  profilePanel?.classList.toggle("is-ready", !isLoading);
  profilePanel?.setAttribute("aria-busy", String(isLoading));
  // Empty startup controls are not a draft. Enable academic entry only after
  // the first aggregate snapshot supplied the revision used by its write API.
  for (const input of [studentFirstNameInput, studentLastNameInput, studentMajorInput, studentYearLevelInput, studentGpaInput]) {
    if (input) input.disabled = !hasLoadedStudentProfile;
  }
  const academicSave = document.getElementById("saveStudentInfoBtn");
  if (academicSave) academicSave.disabled = !hasLoadedStudentProfile || isStudentInfoSaving;
  notifyProfileChange(document);
}

// Inputs stay mounted; the documents tab refreshes through the draft-preserving loader.
const profileTabControllers = new WeakMap();
function initProfileTabs(tablist, defaultTabId, onSelect = () => {}) {
  if (!tablist) return null;
  if (profileTabControllers.has(tablist)) return profileTabControllers.get(tablist);
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const controller = {
    activeId: defaultTabId,
    select(id, focus = false) {
      const selected = tabs.find(tab => tab.id === id);
      if (!selected) return;
      controller.activeId = id;
      for (const tab of tabs) {
        const active = tab === selected;
        tab.setAttribute("aria-selected", String(active));
        tab.setAttribute("tabindex", active ? "0" : "-1");
        tab.classList.toggle("is-active", active);
        const content = document.getElementById(tab.getAttribute("aria-controls"));
        if (content) content.hidden = !active;
      }
      if (tablist.id === "studentProfileTabs") {
        const shortcuts = document.querySelectorAll('[data-profile-section]');
        for (const shortcut of shortcuts) {
          const panel = document.getElementById(shortcut.dataset.profileSection)?.closest('[role="tabpanel"]');
          shortcut.hidden = panel?.id !== selected.getAttribute("aria-controls");
        }
        const navigation = document.querySelector("#panel-profile .profile-section-nav");
        if (navigation) navigation.hidden = ![...shortcuts].some(shortcut => !shortcut.hidden);
      }
      if (focus) selected.focus();
      if (focus) selected.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      onSelect(id);
    },
  };
  for (const tab of tabs) {
    tab.addEventListener("click", () => controller.select(tab.id));
    tab.addEventListener("keydown", event => {
      const index = tabs.indexOf(tab);
      const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
        : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
        : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); controller.select(tabs[next].id, true);
    });
  }
  profileTabControllers.set(tablist, controller);
  controller.select(defaultTabId);
  return controller;
}
const studentProfileTabs = initProfileTabs(document.getElementById("studentProfileTabs"), "profilePersonalTab", id => {
  if (id === "profileDocumentsTab") profileWorkspace?.refreshDocuments();
});
const studentProfileEditTabs = initProfileTabs(document.getElementById("studentProfileEditTabs"), "profileEditPersonalTab");
let profilePdfImport = null;
const profileWorkspace = typeof mountStudentProfileWorkspace === "function" ? mountStudentProfileWorkspace({
  document, reload: loadStudentProfile,
  prepareLegacy: prepareUnifiedLegacyDraft,
  beginMutation: () => { ++studentProfileLoadSequence; },
  reveal: revealProfileSection,
  syncLegacyProfile: syncProfileModalDraft,
  rebaseLegacy: rebaseUnifiedLegacyDraft,
  externalBusy: () => isStudentProfileSaving || isStudentInfoSaving || isProfileImageUploading || profilePdfImport?.busy,
  onSnapshot: result => { profilePdfImport?.acceptSnapshot(result); renderAccountProfile(document, result); syncProfileModalDraft(); },
  onUnauthorized: () => { clearAuthentication(); redirectToLogin(); },
  onCommit: applyProfileWorkspaceCommit,
}) : null;
let profileOutcome = "ready";
const profileFocus = profileModalFocus(profileEditModal, document.getElementById("profileChangePhoto"));
function refreshProfileSaveState() {
  const age = document.getElementById("editAge");
  if (age) { const birthDate = profileWorkspace?.profileValues().birth_date; age.value = birthDate ? calculateAge(birthDate) : ""; }
  const target = document.getElementById("profileSaveState");
  if (!target) return;
  const saving = isStudentInfoSaving || isStudentProfileSaving || isProfileImageUploading || profileWorkspace?.busy || profilePdfImport?.busy;
  if (saveProfileBtn) saveProfileBtn.disabled = saving || !hasLoadedStudentProfile;
  const dirty = hasUnsavedStudentProfile();
  const loadFailed = profilePanel?.dataset.loadState === "error";
  const retry = document.getElementById("profileRetryLoad");
  if (retry) { retry.hidden = !loadFailed; retry.disabled = saving || profilePanel?.dataset.loadState === "loading"; }
  const review = document.getElementById("profileReviewAll");
  if (review) { review.hidden = !profileWorkspace?.hasConflict; review.disabled = saving; }
  for (const id of ["profileSaveAll", "profileSaveAllTop"]) {
    const control = document.getElementById(id);
    if (control) control.disabled = saving || !hasLoadedStudentProfile;
  }
  profileWorkspace?.refreshControls();
  const state = profileWorkspace?.savingProfile || isStudentInfoSaving || isStudentProfileSaving ? "saving" : saving ? "working"
    : loadFailed ? "load-error" : profileWorkspace?.hasConflict ? "conflict" : profileWorkspace?.saveFailed ? "error" : profileOutcome === "error" ? "attention"
    : !hasLoadedStudentProfile ? "loading" : dirty ? "unsaved" : profileOutcome === "saved" ? "saved" : "ready";
  target.dataset.state = state;
  target.textContent = { saving: "กำลังบันทึก", working: "กำลังดำเนินการ", conflict: "ข้อมูลขัดแย้ง · โปรดตรวจฉบับล่าสุด", error: "บันทึกไม่สำเร็จ · Draft ยังอยู่", "load-error": "โหลดไม่สำเร็จ · ลองอีกครั้งได้", attention: "โปรดตรวจข้อความแจ้งเตือน", loading: "กำลังโหลดประวัติ", unsaved: "มีข้อมูลที่ยังไม่บันทึก", saved: "บันทึกแล้ว", ready: "ข้อมูลพร้อมแก้ไข" }[state];
  for (const id of ["profileSaveActionState", "profileSaveTopState"]) {
    const actionState = document.getElementById(id);
    if (actionState) { actionState.dataset.state = state; actionState.textContent = target.textContent; }
  }
}
document.addEventListener("student-profile-state", event => {
  if (event.detail?.outcome) profileOutcome = event.detail.outcome;
  queueMicrotask(refreshProfileSaveState);
});
for (const type of ["input", "change"]) document.addEventListener(type, event => {
  if (!profilePanel?.contains(event.target) && !profileEditModal?.contains(event.target)) return;
  if (profilePanel?.contains(event.target) && PROFILE_INPUTS[event.target.name]) {
    setInputElementValue(document.getElementById(PROFILE_INPUTS[event.target.name]), event.target.value);
  } else if (profileEditModal?.contains(event.target)) {
    const field = Object.keys(PROFILE_INPUTS).find(key => PROFILE_INPUTS[key] === event.target.id);
    if (field) profileWorkspace?.setProfileField(field, event.target.value);
  }
  clearProfileFieldError(event.target);
  profileOutcome = "edit";
  if (studentInfoForm?.contains(event.target)) showMessage(studentInfoMessage, "มีการแก้ไขที่ยังไม่บันทึก", "info");
  if (document.getElementById("profileEditForm")?.contains(event.target)) showMessage(profileEditMessage, "รูปโปรไฟล์ใช้ปุ่มอัปโหลดรูปเพื่อบันทึกแยก", "info");
  queueMicrotask(refreshProfileSaveState);
});
profilePdfImport = typeof mountStudentProfilePdfImport === "function" ? mountStudentProfilePdfImport({
  document, getSnapshot: () => profileWorkspace?.snapshot,
  externalBusy: () => isStudentProfileSaving || isStudentInfoSaving || isProfileImageUploading || profileWorkspace?.busy,
  onUnauthorized: () => { clearAuthentication(); redirectToLogin(); },
  onCommit: (result, revision) => { profileWorkspace?.acceptSnapshot(result, { ownRevision: revision }); applyProfileWorkspaceCommit(result, revision); },
}) : null;
function revealProfileSection(element) {
  const panel = element?.closest('[role="tabpanel"]');
  if (panel?.id) {
    const tab = document.querySelector('#studentProfileTabs [aria-controls="' + panel.id + '"]');
    if (tab) { if (profileEditModal?.classList.contains("open")) closeProfileModal(); studentProfileTabs?.select(tab.id); }
  }
  element?.scrollIntoView?.({ block: "center" });
}
document.querySelectorAll('[data-profile-section]').forEach(button => button.addEventListener("click", () => {
  const section = document.getElementById(button.dataset.profileSection);
  revealProfileSection(section); section?.querySelector("input, select, textarea")?.focus();
}));
function rebaseUnifiedLegacyDraft() {
  const target = document.getElementById("profileAcademicConflict");
  if (target) {
    target.replaceChildren();
    for (const [field, input, label] of [["first_name", studentFirstNameInput, "ชื่อ"], ["last_name", studentLastNameInput, "นามสกุล"],
      ["major", studentMajorInput, "สาขา"], ["year_level", studentYearLevelInput, "ชั้นปี"], ["gpa", studentGpaInput, "GPA สะสม"], ["advisor_teacher_id", studentAdvisorInput, "อาจารย์ที่ปรึกษาประจำชั้น"]]) {
      const mine = input.value.trim(), latest = String(currentStudent?.[field] ?? "").trim();
      if (mine === latest || field === "gpa" && mine && latest && Number(mine) === Number(latest)) continue;
      const item = document.createElement("p");
      const value = field === "advisor_teacher_id" ? input.selectedOptions?.[0]?.textContent || "ยังไม่กำหนด" : mine || "ว่าง";
      const stored = field === "advisor_teacher_id" ? formatTeacherName(currentStudent?.advisorTeacher) : latest || "ว่าง";
      item.textContent = label + " · ค่าที่คุณแก้: " + value + " · ฉบับล่าสุด: " + stored; target.append(item);
    }
    target.hidden = !target.children.length;
  }
  studentInfoRevision = studentProfileRevision;
  if (studentProfileDraft) studentProfileDraft.revision = studentProfileRevision;
}
function syncProfileModalDraft() {
  if (!studentProfileDraft || !profileWorkspace?.snapshot) return;
  fillProfileEditForm(profileWorkspace.snapshot.profile);
  studentProfileDraft = new StudentProfileDraft(readProfileInputs(document), profileWorkspace.snapshot.profile_revision);
  writeProfileInputs(document, profileWorkspace.profileValues());
}
function prepareUnifiedLegacyDraft() {
  const controls = { first_name: studentFirstNameInput, last_name: studentLastNameInput, major: studentMajorInput,
    year_level: studentYearLevelInput, gpa: studentGpaInput, advisor_teacher_id: studentAdvisorInput };
  const sentStudent = Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, input.value]));
  const student = prepareStudentInfoPatch();
  if (!student) { revealProfileSection(studentInfoForm); studentInfoForm?.querySelector('[aria-invalid="true"]')?.focus(); throw new Error("โปรดแก้ไขข้อมูลนักศึกษาที่ระบุ"); }
  const sentProfile = studentProfileDraft ? readProfileInputs(document) : null;
  // Modal inputs mirror the inline drafts, which validate and save these fields.
  // Keeping one owner for each field prevents stale modal values overwriting a
  // section that was explicitly reviewed or discarded in the unified editor.
  const revisions = [];
  if (Object.keys(student).length) revisions.push(studentInfoRevision);
  return { student, revisions, accept(result) {
    document.getElementById("profileAcademicConflict")?.replaceChildren();
    const laterStudent = Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, input.value]));
    currentStudent = result.student; currentStudentProfile = result.profile;
    populateStudentInfoForm(result.student);
    for (const [key, value] of Object.entries(laterStudent)) if (value !== sentStudent[key]) controls[key].value = value;
    hasAdvisorSelectionChanged = (studentAdvisorInput.value || null) !== (result.student.advisor_teacher_id || null);
    studentInfoRevision = result.profile_revision;
    if (studentProfileDraft) {
      const laterProfile = readProfileInputs(document); fillProfileEditForm(result.profile);
      writeProfileInputs(document, studentProfileDraft.acceptSaved(readProfileInputs(document), result.profile_revision, sentProfile, laterProfile));
    }
  } };
}
function applyProfileWorkspaceCommit(result, previousRevision) {
  ++studentProfileLoadSequence;
  setProfileLoading(false);
  clearMessage(profileLoadMessage);
  const academicDraft = captureStudentInfoDraft();
  const modalRaw = studentProfileDraft ? readProfileInputs(document) : null;
  const modalBaseline = studentProfileDraft ? { ...studentProfileDraft.baseline } : null;
  currentStudent = result.student; currentStudentProfile = result.profile;
  studentProfileRevision = result.profile_revision; hasLoadedStudentProfile = true;
  populateStudentInfoForm(currentStudent); restoreStudentInfoDraft(academicDraft);
  if (studentInfoRevision === previousRevision) studentInfoRevision = result.profile_revision;
  if (studentProfileDraft && studentProfileDraft.revision === previousRevision) {
    fillProfileEditForm(currentStudentProfile);
    const merged = studentProfileDraft.acceptSaved(readProfileInputs(document), result.profile_revision, modalBaseline, modalRaw);
    writeProfileInputs(document, merged);
    setInputValue("editAge", merged.birth_date ? calculateAge(merged.birth_date) : "");
  }
  if (selectedProfileImageRevision === previousRevision) selectedProfileImageRevision = result.profile_revision;
  renderStudent(currentStudent); renderStudentProfile(currentStudentProfile); syncCoopPrerequisiteProgram();
}
document.querySelector('.sidebar-item[data-target="panel-profile"]')?.addEventListener("click", () => studentProfileTabs?.select("profilePersonalTab"));

function captureStudentInfoDraft() {
  if (!currentStudent || !studentInfoForm || (typeof hasLoadedStudentProfile !== "undefined" && !hasLoadedStudentProfile)) return null;
  const draft = { first_name: studentFirstNameInput.value, last_name: studentLastNameInput.value, major: studentMajorInput.value, year: studentYearLevelInput.value, gpa: studentGpaInput.value, advisor: studentAdvisorInput.value, advisorChanged: hasAdvisorSelectionChanged };
  draft.changedFields = [];
  for (const field of ["first_name", "last_name"]) {
    if (draft[field].trim() !== String(currentStudent[field] ?? "").trim()) draft.changedFields.push(field);
  }
  if (draft.major !== (currentStudent.major || "")) draft.changedFields.push("major");
  if (draft.year !== String(currentStudent.year_level ?? "")) draft.changedFields.push("year");
  if ((draft.gpa.trim() ? Number(draft.gpa) : null) !== (currentStudent.gpa == null ? null : Number(currentStudent.gpa))) draft.changedFields.push("gpa");
  if (draft.advisorChanged) draft.changedFields.push("advisor");
  return draft.changedFields.length ? draft : null;
}

function restoreStudentInfoDraft(draft) {
  if (!draft) return;
  const changed = new Set(draft.changedFields || ["major", "year", "gpa", "advisor"]);
  if (changed.has("first_name")) setInputElementValue(studentFirstNameInput, draft.first_name);
  if (changed.has("last_name")) setInputElementValue(studentLastNameInput, draft.last_name);
  if (changed.has("major")) setInputElementValue(studentMajorInput, draft.major);
  if (changed.has("year")) setInputElementValue(studentYearLevelInput, draft.year);
  if (changed.has("gpa")) setInputElementValue(studentGpaInput, draft.gpa);
  if (changed.has("advisor")) setInputElementValue(studentAdvisorInput, draft.advisor);
  hasAdvisorSelectionChanged = draft.advisorChanged;
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

  // Editing controls always show stored Thai fields, never the display fallback.
  setInputElementValue(studentFirstNameInput, student.first_name ?? "");
  setInputElementValue(studentLastNameInput, student.last_name ?? "");
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
  const retry = document.getElementById("retryProfileTeachers");
  if (retry) retry.hidden = true;
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
    if (retry) retry.hidden = isTeacherDirectoryLoaded;
  }
}
document.getElementById("retryProfileTeachers")?.addEventListener("click", async () => {
  const draft = captureStudentInfoDraft();
  await loadTeachers(draft?.advisor || currentStudent?.advisor_teacher_id);
  restoreStudentInfoDraft(draft);
  if (isTeacherDirectoryLoaded) { showMessage(studentInfoMessage, "โหลดรายชื่ออาจารย์แล้ว ข้อมูลที่กำลังแก้ไขยังอยู่", "info"); notifyProfileChange(document, "ready"); }
});

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
    profileAvatarImage.onerror = null;
    profileAvatarImage.removeAttribute("src");
    profileAvatarImage.hidden = true;
  }
  if (profileAvatarPlaceholder) {
    profileAvatarPlaceholder.hidden = false;
    profileAvatarPlaceholder.style.display = "flex";
  }
  if (modalProfileImage) {
    modalProfileImage.onerror = null;
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
  const fallback = () => { if (profileImageObjectUrl === objectUrl) resetProfileImagePreview(); };
  if (profileAvatarImage) {
    profileAvatarImage.onerror = fallback;
    profileAvatarImage.src = objectUrl;
    profileAvatarImage.hidden = false;
  }
  if (profileAvatarPlaceholder) {
    profileAvatarPlaceholder.hidden = true;
    profileAvatarPlaceholder.style.display = "none";
  }
  if (modalProfileImage) {
    modalProfileImage.onerror = fallback;
    modalProfileImage.src = objectUrl;
    modalProfileImage.hidden = false;
  }
  if (modalProfileImagePlaceholder) {
    modalProfileImagePlaceholder.hidden = true;
  }
}

function profileRequestDiagnostic(error) {
  // Conflict errors contain a full private snapshot in .data. Never log it,
  // the message, the request/response, or an Error object with custom properties.
  const status = error?.status;
  return { status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null };
}

async function loadProfileImage(hasProfileImage) {
  if (selectedProfileImageFile) return; // Refresh must preserve the selected preview and its snapshot.
  if (!hasProfileImage) {
    resetProfileImagePreview();
    return;
  }

  try {
    const image = await getStudentProfileImage();
    showProfileImagePreview(URL.createObjectURL(image));
  } catch (error) {
    console.error("LOAD PROFILE IMAGE ERROR:", profileRequestDiagnostic(error));

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
  button.setAttribute("aria-busy", String(isLoading));
  button.innerHTML = isLoading
    ? `<i class="fa-solid fa-spinner fa-spin"></i>${loadingLabel}`
    : defaultLabel;
  notifyProfileChange(document);
}

async function uploadSelectedProfileImage() {
  if (isProfileImageUploading || isStudentProfileSaving || (typeof isStudentInfoSaving !== "undefined" && isStudentInfoSaving) || (typeof profileWorkspace !== "undefined" && profileWorkspace?.busy) || (typeof profilePdfImport !== "undefined" && profilePdfImport?.busy)) {
    return;
  }

  const token = getStudentToken();
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
  if (typeof studentProfileLoadSequence === "number") ++studentProfileLoadSequence;
  clearMessage(profileImageMessage);
  profileImageInput.disabled = true;
  setStudentInfoButtonState(
    uploadProfileImageBtn,
    true,
    "กำลังอัปโหลด...",
    '<i class="fa-solid fa-cloud-arrow-up"></i>อัปโหลดรูป'
  );

  try {
    const result = await uploadStudentProfileImage(formData, selectedProfileImageRevision);
    if (typeof profileWorkspace !== "undefined") profileWorkspace?.acceptSnapshot(result, { ownRevision: selectedProfileImageRevision });
    studentProfileRevision = result.profile_revision;

    selectedProfileImageFile = null;
    selectedProfileImageRevision = null;
    if (profileImageInput) {
      profileImageInput.value = "";
    }
    currentStudent = {
      ...(currentStudent || {}),
      profile_image: result.profile_image || true,
    };
    await loadProfileImage(true);
    showMessage(profileImageMessage, "อัปโหลดรูปโปรไฟล์สำเร็จ", "success");
    notifyProfileChange(document, "saved");
    showToast("อัปโหลดรูปโปรไฟล์สำเร็จ", "success");
  } catch (error) {
    console.error("UPLOAD PROFILE IMAGE ERROR:", profileRequestDiagnostic(error));

    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }

    showMessage(profileImageMessage, error.message || "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้", "error");
    if (error.status === 409) {
      showConfirmModal({
        title: "ตรวจสอบประวัติล่าสุดก่อนอัปโหลดรูป",
        message: "ข้อมูลเปลี่ยนจากหน้าต่างอื่น รูปที่เลือกยังอยู่ ต้องการโหลดข้อมูลล่าสุดและใช้รูปนี้ในการอัปโหลดครั้งถัดไปหรือไม่?",
        confirmLabel: "โหลดล่าสุดและเก็บรูปที่เลือก",
        onConfirm: async () => {
          const latest = await loadStudentProfile();
          if (!latest || !studentProfileRevision) throw new Error("โหลดไม่สำเร็จ รูปที่เลือกยังอยู่");
          selectedProfileImageRevision = studentProfileRevision;
        },
      });
    }
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

function prepareStudentInfoPatch() {
  const major = studentMajorInput?.value.trim() || "";
  const yearLevel = studentYearLevelInput?.value ? Number(studentYearLevelInput.value) : null;
  const gpaValue = studentGpaInput?.value.trim() || "";
  const gpa = gpaValue ? Number(gpaValue) : null;

  clearMessage(studentInfoMessage);
  clearProfileErrors(studentInfoForm);
  if (studentGpaInput.validity.badInput) {
    profileFieldError(studentGpaInput, "กรุณากรอก GPA เป็นตัวเลขระหว่าง 0.00–4.00");
    showMessage(studentInfoMessage, "โปรดแก้ไข GPA สะสม", "error"); return;
  }
  if (yearLevel !== null && (!Number.isSafeInteger(yearLevel) || yearLevel < 1 || yearLevel > 4)) {
    profileFieldError(studentYearLevelInput, "เลือกชั้นปีตั้งแต่ 1 ถึง 4 หรือเว้นว่าง");
    showMessage(studentInfoMessage, "กรุณากรอกสาขาและชั้นปีให้ถูกต้อง", "error");
    return;
  }
  if (gpa !== null && (!/^\d(?:\.\d{1,2})?$/.test(gpaValue) || gpa < 0 || gpa > 4)) {
    profileFieldError(studentGpaInput, "กรอก GPA 0.00–4.00 โดยมีทศนิยมไม่เกิน 2 ตำแหน่ง");
    showMessage(studentInfoMessage, "GPA ต้องอยู่ระหว่าง 0.00 ถึง 4.00", "error");
    return;
  }

  const candidate = {
    major: major || null,
    year_level: yearLevel,
    gpa,
  };
  const payload = Object.fromEntries(Object.entries(candidate).filter(([key, value]) =>
    key === "gpa" ? (currentStudent?.[key] == null ? null : Number(currentStudent[key])) !== value : (currentStudent?.[key] ?? null) !== value));
  for (const [field, input, label] of [["first_name", studentFirstNameInput, "ชื่อ"], ["last_name", studentLastNameInput, "นามสกุล"]]) {
    const value = input.value.trim();
    // Preserve untouched legacy names, including English names in the main columns.
    if (value === String(currentStudent?.[field] ?? "").trim()) continue;
    if (!isThaiPersonName(value)) {
      profileFieldError(input, [...value].length > MAX_PERSON_NAME_LENGTH ? `${label}ต้องไม่เกิน ${MAX_PERSON_NAME_LENGTH} อักขระ` : `กรุณากรอก${label}เป็นภาษาไทย ไม่ใช้ตัวเลขหรือสัญลักษณ์พิเศษ`);
      showMessage(studentInfoMessage, [...value].length > MAX_PERSON_NAME_LENGTH
        ? `${label}ต้องมีความยาวไม่เกิน ${MAX_PERSON_NAME_LENGTH} อักขระ`
        : `กรุณากรอก${label}เป็นภาษาไทยเท่านั้น`, "error");
      input.focus();
      return;
    }
    payload[field] = value;
  }
  // Omitted fields are preserved by the backend; only user changes update the advisor.
  if (isTeacherDirectoryLoaded && hasAdvisorSelectionChanged) {
    payload.advisor_teacher_id = studentAdvisorInput.value || null;
  }
  return payload;
}

async function saveStudentInfo(event) {
  event.preventDefault();
  if (isStudentInfoSaving || (typeof isStudentProfileSaving !== "undefined" && isStudentProfileSaving) || (typeof isProfileImageUploading !== "undefined" && isProfileImageUploading) || (typeof profileWorkspace !== "undefined" && profileWorkspace?.busy) || (typeof profilePdfImport !== "undefined" && profilePdfImport?.busy)) {
    return;
  }

  const token = getStudentToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  const payload = prepareStudentInfoPatch();
  if (!payload) return;
  if (!Object.keys(payload).length) {
    showMessage(studentInfoMessage, "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info");
    return;
  }

  const defaultButtonLabel = '<i class="fa-solid fa-floppy-disk"></i>บันทึกข้อมูลนักศึกษา';
  const saveStudentInfoBtn = document.getElementById("saveStudentInfoBtn");
  isStudentInfoSaving = true;
  if (typeof studentProfileLoadSequence === "number") ++studentProfileLoadSequence;
  setStudentInfoButtonState(saveStudentInfoBtn, true, "กำลังบันทึก...", defaultButtonLabel);

  try {
    const result = await updateStudentInfo(payload, studentInfoRevision);
    if (typeof profileWorkspace !== "undefined") profileWorkspace?.acceptSnapshot(result, { ownRevision: studentInfoRevision });
    if (!result.profile_revision || !result.student) throw new Error("ไม่สามารถยืนยันผลบันทึกได้ กรุณาโหลดข้อมูลล่าสุด");
    const remainingDraft = captureStudentInfoDraft();
    currentStudent = result.student;
    populateStudentInfoForm(currentStudent);
    restoreStudentInfoDraft(remainingDraft);
    hasAdvisorSelectionChanged = (studentAdvisorInput.value || null) !== (currentStudent.advisor_teacher_id || null);
    studentInfoRevision = result.profile_revision;
    studentProfileRevision = result.profile_revision;

    const student = await loadStudentProfile();
    const pendingAcademic = captureStudentInfoDraft();
    await loadTeachers(student?.advisor_teacher_id);
    restoreStudentInfoDraft(pendingAcademic);
    showMessage(studentInfoMessage, !student ? "บันทึกสำเร็จ แต่โหลดข้อมูลซ้ำไม่สำเร็จ กรุณาลองโหลดข้อมูลล่าสุด" : !isTeacherDirectoryLoaded ? "บันทึกสำเร็จ แต่ยังโหลดรายชื่ออาจารย์ไม่ได้ กรุณากดลองโหลดรายชื่ออีกครั้ง" : captureStudentInfoDraft() ? "บันทึกสำเร็จ ข้อมูลที่แก้ระหว่างบันทึกยังอยู่ กรุณาบันทึกอีกครั้งเมื่อพร้อม" : "บันทึกข้อมูลนักศึกษาสำเร็จ", "success");
    notifyProfileChange(document, !student || !isTeacherDirectoryLoaded ? "error" : "saved");
    showToast("บันทึกข้อมูลนักศึกษาสำเร็จ", "success");
  } catch (error) {
    console.error("SAVE STUDENT INFO ERROR:", profileRequestDiagnostic(error));

    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }

    showMessage(studentInfoMessage, error.message || "ไม่สามารถบันทึกข้อมูลนักศึกษาได้", "error");
    if (error.status === 409) {
      showConfirmModal({
        title: "โหลดข้อมูลนักศึกษาล่าสุด",
        message: "ข้อมูลเปลี่ยนจากหน้าต่างอื่น การแก้ไขของคุณยังอยู่ ต้องการทิ้งการแก้ไขข้อมูลการศึกษาและโหลดล่าสุดหรือไม่?",
        confirmLabel: "ทิ้งการแก้ไขและโหลดล่าสุด",
        onConfirm: async () => {
          const latest = await loadStudentProfile();
          if (!latest || !studentProfileRevision) throw new Error("โหลดไม่สำเร็จ การแก้ไขเดิมยังอยู่");
          populateStudentInfoForm(latest);
          studentInfoRevision = studentProfileRevision;
        },
      });
    }
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
    selectedProfileImageRevision = null;
    uploadProfileImageBtn.disabled = true;
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    profileImageInput.value = "";
    selectedProfileImageFile = null;
    selectedProfileImageRevision = null;
    uploadProfileImageBtn.disabled = true;
    showMessage(profileImageMessage, "รองรับเฉพาะ JPG, PNG และ WEBP", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    profileImageInput.value = "";
    selectedProfileImageFile = null;
    selectedProfileImageRevision = null;
    uploadProfileImageBtn.disabled = true;
    showMessage(profileImageMessage, "ขนาดรูปต้องไม่เกิน 5 MB", "error");
    return;
  }

  selectedProfileImageFile = file;
  selectedProfileImageRevision = studentProfileRevision;
  showProfileImagePreview(URL.createObjectURL(file));
  uploadProfileImageBtn.disabled = false;
});

document.getElementById("editBirthDate")?.addEventListener("change", () => {
  setInputValue("editAge", calculateAge(getInputValue("editBirthDate")));
});

uploadProfileImageBtn?.addEventListener("click", uploadSelectedProfileImage);
studentInfoForm?.addEventListener("submit", event => { event.preventDefault(); profileWorkspace?.saveAll(); });
window.addEventListener("beforeunload", clearProfileImageObjectUrl);

function renderStudent(student) {
  renderProfileAdvisors(document, student, { loaded: isAdvisorLoaded, request: projectAdvisorRequest, confirmed: confirmedProjectAdvisor });
  currentStudent = student;
  renderJobMatchingSource();
  const firstName =
    student.first_name || "";

  const lastName =
    student.last_name || "";

  const prefix = String(currentStudentProfile?.prefix || "").trim();
  const fullName = [prefix, firstName, lastName].filter(Boolean).join(" ") || "-";
  const displayName = [firstName, lastName].some(value => value.trim()) ? fullName
    : [currentStudentProfile?.english_first_name, currentStudentProfile?.english_last_name].filter(Boolean).join(" ") || "-";

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
      displayName;
  }

  // Welcome
  if (overviewGreeting) {
    overviewGreeting.textContent =
      `ยินดีต้อนรับ ${displayName}`;
  }

  // Profile main
  setText(
    profileFullName,
    displayName
  );

  setText(
    profileStudentId,
    studentId
  );

  setText(
    profileEmail,
    email
  );
  setText(document.getElementById("profileSummaryMajor"), [student.major, student.year_level ? "ชั้นปี " + student.year_level : null].filter(Boolean).join(" · ") || "ยังไม่ระบุ");
  setText(document.getElementById("profileSummaryStatus"), status);

  renderStudentAccountInfo(student);

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
    student.track === "internship" ? "ฝึกงาน" : "สหกิจศึกษา"
  );

  setText(
    studentStatus,
    status
  );
}

// ==============================
// Render Student Profile
// ==============================

function renderStudentAccountInfo(student) {
  // Only the verified current actor and its owner Profile supply account details.
  const profile = student?.id && currentStudentProfile?.student_id === student.id ? currentStudentProfile : null;
  const name = [student?.first_name, student?.last_name].filter(value => typeof value === "string" && value.trim()).join(" ")
    || [profile?.english_first_name, profile?.english_last_name].filter(value => typeof value === "string" && value.trim()).join(" ");
  setText(document.getElementById("studentAccountName"), student ? name || "ยังไม่ได้ระบุชื่อ" : "กรุณาเข้าสู่ระบบใหม่");
  setText(document.getElementById("studentAccountStudentId"), student ? getStudentCode(student) : "—");
  setText(document.getElementById("studentAccountEmail"), student?.email || "—");
  document.getElementById("studentAccountInfo")?.setAttribute("aria-busy", "false");
  setText(document.getElementById("studentAccountInfoStatus"), student ? "ข้อมูลบัญชีปัจจุบัน · อ่านอย่างเดียว" : "สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบอีกครั้ง");
}

function renderStudentProfile(profile) {
  renderJobMatchingSource();
  if (!profile) {
    console.log(
      "Student profile is empty."
    );

    return;
  }

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

  if (!hasLoadedStudentProfile || !studentProfileRevision) {
    showMessage(profileLoadMessage, "กรุณาโหลดข้อมูลประวัติให้สำเร็จก่อนแก้ไข", "error");
    return;
  }
  fillProfileEditForm(currentStudentProfile);
  studentProfileDraft = new StudentProfileDraft(readProfileInputs(document), studentProfileRevision);
  writeProfileInputs(document, profileWorkspace?.profileValues() || {});

  studentProfileEditTabs?.select(studentProfileTabs?.activeId === "profileContactTab" ? "profileEditContactTab" : "profileEditPersonalTab");

  clearMessage(
    profileEditMessage
  );

  profileFocus.open();
  profileEditModal?.classList.add(
    "open"
  );

  profileEditModal?.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  document.getElementById(studentProfileEditTabs?.activeId)?.focus();
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

  profileFocus.close();
}

function openProfileImageEditor() {
  openProfileEditModal();
  studentProfileEditTabs?.select("profileEditPersonalTab");

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

function applySavedStudentProfile(result, sentRaw) {
  if (typeof profileWorkspace !== "undefined") profileWorkspace?.acceptSnapshot(result, { ownRevision: studentProfileDraft?.revision });
  const currentRaw = readProfileInputs(document);
  currentStudentProfile = result.profile || null;
  studentProfileRevision = result.profile_revision;
  if (currentStudent) currentStudent.profile = currentStudentProfile;
  fillProfileEditForm(currentStudentProfile);
  const merged = studentProfileDraft.acceptSaved(
    readProfileInputs(document), studentProfileRevision, sentRaw, currentRaw,
  );
  writeProfileInputs(document, merged);
  setInputValue("editAge", merged.birth_date ? calculateAge(merged.birth_date) : "");
  renderStudentProfile(currentStudentProfile);
  if (currentStudent) renderStudent(currentStudent);
}

let studentProfileConflict = false;
const reloadProfileConflictBtn = document.getElementById("reloadProfileConflictBtn");
function reloadStudentProfileAfterConflict() {
  if (isStudentProfileSaving || isProfileImageUploading) return;
  showConfirmModal({
    title: "โหลดประวัติล่าสุด",
    message: "การแก้ไขที่ยังไม่บันทึกในทั้งสองหมวดจะถูกทิ้ง และใช้ข้อมูลล่าสุดจากระบบ ต้องการดำเนินการต่อหรือไม่?",
    confirmLabel: "ทิ้งการแก้ไขและโหลดล่าสุด",
    returnFocus: reloadProfileConflictBtn,
    onConfirm: async () => {
      const discardedRaw = readProfileInputs(document);
      const latest = await loadStudentProfile();
      if (!latest || !studentProfileRevision) throw new Error("โหลดข้อมูลไม่สำเร็จ การแก้ไขเดิมยังคงอยู่");
      applySavedStudentProfile({ profile: currentStudentProfile, profile_revision: studentProfileRevision }, discardedRaw);
      studentProfileConflict = false;
      reloadProfileConflictBtn.hidden = true;
      showMessage(profileEditMessage, "โหลดข้อมูลล่าสุดแล้ว กรุณาตรวจสอบก่อนแก้ไข", "info");
    },
  });
}
reloadProfileConflictBtn?.addEventListener("click", reloadStudentProfileAfterConflict);

async function saveStudentProfile() {
  if (isStudentProfileSaving || isProfileImageUploading || (typeof isStudentInfoSaving !== "undefined" && isStudentInfoSaving) || (typeof profileWorkspace !== "undefined" && profileWorkspace?.busy) || (typeof profilePdfImport !== "undefined" && profilePdfImport?.busy)) return;
  if (!getStudentToken()) { redirectToLogin(); return; }
  if (!hasLoadedStudentProfile || !studentProfileDraft?.revision) {
    showMessage(profileEditMessage, "กรุณาโหลดข้อมูลประวัติให้สำเร็จก่อนบันทึก", "error");
    return;
  }
  if (studentProfileConflict) {
    showMessage(profileEditMessage, "ข้อมูลมีการเปลี่ยนแปลงจากหน้าต่างอื่น การแก้ไขของคุณยังอยู่ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก", "error");
    return;
  }
  clearMessage(profileEditMessage);
  clearProfileErrors(document.getElementById("profileEditForm"));
  let sentRaw, payload;
  try {
    for (const [field, id] of Object.entries(PROFILE_INPUTS)) {
      const input = document.getElementById(id);
      if (input?.validity?.badInput) {
        throw Object.assign(new Error("กรุณาระบุวันที่หรือตัวเลขให้ครบถ้วนและถูกต้อง"), { field });
      }
    }
    sentRaw = readProfileInputs(document);
    payload = studentProfileDraft.patch(sentRaw);
  } catch (error) {
    if (error.field) {
      const input = document.getElementById(PROFILE_INPUTS[error.field]);
      if (input) { studentProfileEditTabs?.select(input.closest('[role="tabpanel"]')?.getAttribute("aria-labelledby")); profileFieldError(input, error.message); }
    }
    showMessage(profileEditMessage, error.message, "error");
    return;
  }
  if (!Object.keys(payload).length) {
    showMessage(profileEditMessage, "ไม่มีข้อมูลที่เปลี่ยนแปลง", "info");
    return;
  }
  const revision = studentProfileDraft.revision;
  isStudentProfileSaving = true;
  notifyProfileChange(document);
  // A GET started before this write must not replace the committed response.
  ++studentProfileLoadSequence;
  setProfileLoading(false);
  try {
    if (saveProfileBtn) {
      saveProfileBtn.disabled = true;
      saveProfileBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...`;
    }
    const result = await updateMyStudentProfile(payload, revision);
    if (!result.profile_revision || !Object.hasOwn(result, "profile")) {
      throw new Error("ไม่สามารถยืนยันผลบันทึกได้ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง");
    }
    applySavedStudentProfile(result, sentRaw);
    notifyProfileChange(document, "saved");
    const refreshed = await loadStudentProfile();
    showMessage(profileEditMessage, refreshed
      ? "บันทึกข้อมูลเรียบร้อยแล้ว"
      : "บันทึกสำเร็จ แต่โหลดข้อมูลซ้ำไม่สำเร็จ แสดงข้อมูลที่ระบบยืนยันจากการบันทึก", refreshed ? "success" : "info");
    showToast("บันทึกข้อมูลประวัติเรียบร้อยแล้ว", "success");
    if (refreshed) {
      setTimeout(() => {
        if (!isStudentProfileSaving && !studentProfileDraft.hasChanges(readProfileInputs(document))) closeProfileModal();
      }, 500);
    }
  } catch (error) {
    if (error.status === 401) { clearAuthentication(); redirectToLogin(); return; }
    if (error.status === 409) {
      studentProfileConflict = true;
      if (reloadProfileConflictBtn) reloadProfileConflictBtn.hidden = false;
    }
    showMessage(profileEditMessage, error.status === 409
      ? `${error.message} การแก้ไขของคุณยังคงอยู่ หากต้องการใช้ข้อมูลล่าสุด ให้เลือกทิ้งการแก้ไขและโหลดใหม่`
      : error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
  } finally {
    isStudentProfileSaving = false;
    notifyProfileChange(document);
    if (saveProfileBtn) {
      saveProfileBtn.disabled = false;
      saveProfileBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล`;
    }
  }
}

window.addEventListener("beforeunload", event => {
  // Logout already obtained consent to discard drafts; do not block it again.
  if (studentLogoutCompleted) return;
  if (studentProfileDraft?.hasChanges(readProfileInputs(document)) || captureStudentInfoDraft() || selectedProfileImageFile || (typeof profileWorkspace !== "undefined" && profileWorkspace?.hasChanges()) || (typeof profilePdfImport !== "undefined" && profilePdfImport?.hasChanges()) || hasUnsavedProjectWork()) {
    event.preventDefault();
    event.returnValue = "";
  }
});

document.getElementById("profileEditForm")?.addEventListener("submit", event => event.preventDefault());
document.getElementById("profileModalContactLink")?.addEventListener("click", () => {
  closeProfileModal(); studentProfileTabs?.select("profileContactTab");
  const section = document.getElementById("profileContactExtras");
  revealProfileSection(section); section?.querySelector("input, select, textarea")?.focus();
});

profileAvatarButton?.addEventListener("click", openProfileImageEditor);
document.getElementById("profileChangePhoto")?.addEventListener("click", openProfileImageEditor);

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
      event.key === "Escape" && !document.querySelector('.app-confirm-overlay:not(.is-leaving)') &&
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

function hasUnsavedStudentProfile() {
  return Boolean(studentProfileDraft?.hasChanges(readProfileInputs(document)) || captureStudentInfoDraft() || selectedProfileImageFile || profileWorkspace?.hasChanges() || profilePdfImport?.hasChanges());
}
function completeStudentLogout(expectedToken) {
  if (studentLogoutInProgress || studentLogoutCompleted) return;
  studentLogoutInProgress = true;
  logoutBtn.disabled = true;
  logoutBtn.setAttribute("aria-busy", "true");
  try {
    if (!clearAuthentication({ expectedToken })) {
      throw new Error("ยังล้างสถานะเข้าสู่ระบบไม่ได้ หรือบัญชีเข้าสู่ระบบเปลี่ยนแล้ว กรุณาลองออกจากระบบอีกครั้ง");
    }
    studentLogoutCompleted = true;
    // Stop cached/pending work and discard only this Student page's UI state.
    ++studentProfileLoadSequence;
    currentStudent = currentStudentProfile = studentProfileDraft = null;
    studentProfileRevision = studentInfoRevision = selectedProfileImageRevision = null;
    hasLoadedStudentProfile = false;
    selectedProfileImageFile = null;
    currentMentor = null;
    coopRequests = [];
    coopRequestHasDraft = false;
    for (const cleanup of [clearProfileImageObjectUrl, () => studentGoogleAccount?.dispose(), () => mentorStatusSync.destroy(), invalidateJobMatchingSource, resetJobBrowser]) {
      try { cleanup(); } catch { /* Session is already cleared; continue teardown. */ }
    }
  } finally {
    if (studentLogoutCompleted) {
      // A history/BFCache restore must not expose the previous Student's UI.
      try {
        for (const field of document.querySelectorAll("input, textarea, select")) {
          field.value = "";
          if (field.type === "checkbox" || field.type === "radio") field.checked = false;
        }
      } finally {
        document.body.replaceChildren();
        redirectToLogin();
      }
    } else {
      studentLogoutInProgress = false;
      logoutBtn.disabled = false;
      logoutBtn.setAttribute("aria-busy", "false");
    }
  }
}

function logout(event) {
  event?.preventDefault();
  if (studentLogoutInProgress || studentLogoutCompleted || studentLogoutConfirmationOpen) return;
  const expectedToken = getStudentToken();
  if (hasUnsavedStudentProfile() || hasUnsavedProjectWork()) {
    studentLogoutConfirmationOpen = true;
    showConfirmModal({ title: "ออกจากระบบโดยยังไม่บันทึก?", message: hasUnsavedProjectWork() ? "ข้อมูลที่ยังไม่บันทึกรวมถึงร่างหัวข้อและลิงก์โครงการจะหายเมื่อออกจากระบบ" : "ข้อมูลประวัติที่ยังไม่บันทึกจะหายเมื่อออกจากระบบ", confirmLabel: "ออกจากระบบ", onClose: () => { studentLogoutConfirmationOpen = false; }, onConfirm: () => completeStudentLogout(expectedToken) });
    return;
  }
  try { completeStudentLogout(expectedToken); }
  catch (error) { if (!studentLogoutCompleted) showToast(error.message, "error"); }
}

function clearAuthentication(options) {
  // A late failure from this logged-out page must not clear a newer login.
  if (studentLogoutCompleted) return true;
  // Browser authentication must be removed before optional UI cleanup can fail.
  if (options?.expectedToken === null) {
    // An inactive Student tab must not publish logout for a newer Role session.
    try {
      if (sessionStorage.getItem("token") !== null || localStorage.getItem("token") !== null) return false;
    } catch { return false; }
  } else if (!clearStudentSession(options)) return false;
  for (const cleanup of [revokeStudentProjectSession, () => mentorStatusSync.setActive(false), () => mentorLoadController?.abort(), () => studentOverview.clear()]) {
    try { cleanup(); } catch { /* Keep clearing the remaining Student UI state. */ }
  }
  return true;
}

function handleStudentSessionChange() {
  if (studentLogoutCompleted) { redirectToLogin(); return; }
  revokeStudentProjectSession();
  invalidateJobMatchingSource();
  resetJobBrowser();
  coopHeadSequence++;
  coopHeadContext = null;
  coopHeadError = null;
  coopHeadLoading = false;
  renderCoopPreviewHead();
  coopRequestDetailSequence++;
  coopRequestDetailId = null;
  coopRequestDetailLoading = false;
  if (coopRequestDetailData) coopRequestDetailData.hidden = true;
  document.getElementById('coopDetailHeadApproval')?.replaceChildren();
  coopClassAdvisorSequence++;
  coopClassAdvisor = null;
  coopClassAdvisorLoading = false;
  coopRequestHasDraft = false;
  coopRequestForm?.reset();
  coopPrerequisiteState = new Map();
  coopRequests = [];
  coopRequestsLoaded = false;
  coopRequestsLoadError = false;
  coopAcademicDetail?.dispose();
  document.getElementById('coopAcademicDetail')?.replaceChildren();
  mentorStatusSync.setActive(false);
  mentorLoadController?.abort();
  currentMentor = null;
  renderMentor();
  studentOverview.clear();
  renderStudentAccountInfo(null);
  renderAccountProfile(document, null);
  if (hasUnsavedStudentProfile()) {
    showActionModal({ title: "สถานะเข้าสู่ระบบเปลี่ยนแล้ว", message: "กรุณาเก็บข้อมูลที่ยังไม่บันทึกก่อนกลับไปเข้าสู่ระบบ ข้อมูลในหน้านี้จะไม่ถูกส่งไปยังบัญชีอื่น", actionLabel: "ไปหน้าเข้าสู่ระบบ", onAction: redirectToLogin });
  } else redirectToLogin();
}

document.getElementById("studentAccountProfileReload")?.addEventListener("click", () => loadStudentProfile());
document.addEventListener('student:google-profile-updated', () => {
  if (!studentLogoutCompleted && !studentLogoutInProgress && getStudentToken() && currentStudent?.id) {
    // Existing aggregate refresh retains unsaved profile/academic/image drafts.
    loadStudentProfile();
  }
});
document.getElementById("studentAccountProfileEdit")?.addEventListener("click", () => {
  document.querySelector('.sidebar-item[data-target="panel-profile"]')?.click();
  document.getElementById("profilePersonalTab")?.focus();
});

function redirectToLogin() {
  window.location.replace("/login.html");
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
  // The former upload destination now opens the combined project panel.
  if (targetId === "panel-report-upload") targetId = "panel-coop";
  if (!canOpenStudentPanel(currentStudent, targetId)) return Promise.resolve(false);
  sidebarItems.forEach((item) => item.classList.toggle("active", item.dataset.target === targetId));
  revealNavigationItem(document.querySelector('.sidebar-menu'), [...sidebarItems].find(item => item.dataset.target === targetId));
  contentPanels.forEach((panel) => panel.classList.toggle("active", panel.id === targetId));
  mentorStatusSync.setActive(targetId === "panel-mentor");
  if (targetId === "panel-evaluate") return companyEvaluation.load();
  if (targetId === "panel-request") return loadCoopRequests();
  if (targetId === "panel-coop") loadProjectAdvisorRequest();
  if (targetId === "panel-job-matching") { refreshJobMatchingSource(); loadJobBrowser(1); }
  if (targetId === "panel-google-account") studentGoogleAccount?.load();
  window.scrollTo({ top: 0, behavior: "smooth" });
  return Promise.resolve(true);
}

window.addEventListener('resize', () => revealNavigationItem(document.querySelector('.sidebar-menu'), document.querySelector('.sidebar-item.active')));

sidebarItems.forEach(
  (item) => {
    item.addEventListener("click", event => {
      const targetId = item.dataset.target;
      if (targetId && targetId !== "panel-coop" && document.getElementById("panel-coop")?.classList.contains("active") && hasUnsavedProjectWork()) {
        event.preventDefault(); event.stopImmediatePropagation();
        const context = projectContext();
        showConfirmModal({ title: "ออกจากหน้าโครงการ?", message: "ร่างหัวข้อและลิงก์ยังอยู่เมื่อกลับมาในหน้านี้ แต่จะหายหากรีเฟรชหรือปิดหน้า กรุณาบันทึกก่อนออกจากระบบ", confirmLabel: "ไปยังเมนูที่เลือก", onConfirm: () => context && acceptProjectResponse(context) && activateDashboardPanel(targetId) });
        return;
      }
      if (!targetId || targetId === "panel-profile" || !document.getElementById("panel-profile")?.classList.contains("active") || !hasUnsavedStudentProfile()) return;
      event.preventDefault(); event.stopImmediatePropagation();
      showConfirmModal({ title: "ออกจากหน้าประวัติ?", message: "Draft ยังอยู่เมื่อกลับมาในหน้านี้ แต่จะหายหากรีเฟรชหรือปิดหน้า กรุณาบันทึกก่อนออกจากระบบ", confirmLabel: "ไปยังเมนูที่เลือก", onConfirm: () => activateDashboardPanel(targetId) });
    }, true);
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
const jobMatchingAnalysis = document.getElementById("jobMatchingAnalysis");
const jobMatchingRetry = document.getElementById("jobMatchingRetry");
let isJobMatchingLoading = false;
let lastMatchingSource = null;
let savedJobMatchingSource = null;
let jobMatchingSourceState = "idle";
let jobMatchingSourceSequence = 0;
let jobMatchingSourceVersion = 0;
let jobMatchingRetrySource = "skills";
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
  const unavailable = jobMatchingSourceState === "error"
    ? "โหลดข้อมูลที่บันทึกไม่สำเร็จ กรุณาเปิดเมนูนี้ใหม่"
    : "กำลังโหลดข้อมูลที่บันทึก...";
  setText(document.getElementById("jobMatchingMajor"), savedJobMatchingSource
    ? savedJobMatchingSource.major?.trim() || "ยังไม่ได้ระบุ" : unavailable);
  const target = document.getElementById("jobMatchingSkills");
  if (target) {
    target.replaceChildren();
    if (!savedJobMatchingSource) {
      target.textContent = unavailable;
    } else {
      const skills = savedJobMatchingSource.computer_skills;
      if (skills.length) {
        const list = createJobMatchingElement("div", "", "job-skill-chips");
        skills.forEach((skill) => {
          const level = skill.proficiency_label || skill.proficiency;
          list.append(createJobMatchingElement("span", `${skill.skill_name}${level ? ` · ${level}` : ""}`, "job-skill-chip"));
        });
        target.append(list);
      }
      const related = savedJobMatchingSource.related_skills?.trim();
      if (related) target.append(createJobMatchingElement("p", `Related Skills: ${related}`, "job-related-skills"));
      if (!skills.length && !related) target.textContent = "ยังไม่ได้ระบุ";
    }
  }
  if (jobMatchingSkillsBtn) jobMatchingSkillsBtn.disabled = isJobMatchingLoading || jobMatchingSourceState !== "ready";
  [[jobMatchingSkillsBtn, "fa-wand-magic-sparkles"], [jobMatchingResumeBtn, "fa-file-lines"]].forEach(([button, iconName]) => {
    if (!button) return;
    const label = button.textContent;
    const icon = document.createElement("i");
    icon.className = `fa-solid ${button.classList.contains("is-loading") ? "fa-spinner fa-spin" : iconName}`;
    icon.setAttribute("aria-hidden", "true");
    button.replaceChildren(icon, document.createTextNode(` ${label.trim()}`));
  });
}

function invalidateJobMatchingSource() {
  jobMatchingSourceVersion++;
  jobMatchingSourceSequence++;
  savedJobMatchingSource = null;
  jobMatchingSourceState = "idle";
  lastMatchingSource = null;
  jobMatchingResults?.replaceChildren();
  renderMatchingAnalysis(jobMatchingAnalysis, null);
  clearMessage(jobMatchingMessage);
  if (jobMatchingEmpty) jobMatchingEmpty.hidden = true;
  if (jobMatchingResultSource) { jobMatchingResultSource.hidden = true; jobMatchingResultSource.textContent = ""; }
  renderJobMatchingSource();
}

async function refreshJobMatchingSource() {
  const sequence = ++jobMatchingSourceSequence, token = getStudentToken();
  savedJobMatchingSource = null;
  jobMatchingSourceState = "loading";
  renderJobMatchingSource();
  try {
    const result = await getMyJobMatchingSource();
    if (sequence !== jobMatchingSourceSequence || token !== getStudentToken()) return;
    if (!Array.isArray(result?.matching_source?.computer_skills)) throw new Error("Invalid matching source");
    savedJobMatchingSource = result.matching_source;
    jobMatchingSourceState = "ready";
  } catch (error) {
    if (sequence !== jobMatchingSourceSequence || token !== getStudentToken()) return;
    savedJobMatchingSource = null;
    jobMatchingSourceState = "error";
    jobMatchingRetrySource = "skills";
    if (jobMatchingRetry) jobMatchingRetry.hidden = false;
    if (error.status === 401) { clearAuthentication(); redirectToLogin(); return; }
  }
  renderJobMatchingSource();
}

document.addEventListener("student-profile-state", (event) => {
  // Profile editors emit saved/ready only after receiving a persisted snapshot.
  // Ignore edit/draft notifications, and never read their form controls.
  if (!["saved", "ready"].includes(event.detail?.outcome)) return;
  invalidateJobMatchingSource();
  if (document.getElementById("panel-job-matching")?.classList.contains("active")) refreshJobMatchingSource();
});

function createJobMatchingElement(tag, value, className = "") {
  const element = document.createElement(tag);
  element.textContent = value;
  element.className = className;
  return element;
}

function renderJobMatches(matches) {
  const cards = matches.map((match) => createJobCard(match, { recommendation: true, canWrite: canUseCoopFeatures(currentStudent) }));
  jobMatchingResults.replaceChildren(...cards);
}
const JOB_MATCHING_ERRORS = {
  400: "เลือกแหล่งข้อมูลสำหรับวิเคราะห์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
  403: "บัญชีนี้ไม่มีสิทธิ์ใช้งานการแนะนำตำแหน่งงาน",
  404: "ไม่พบข้อมูลนักศึกษา",
  422: "ยังไม่มีข้อมูลเพียงพอ กรุณาบันทึกทักษะหรืออัปโหลด Resume ที่อ่านได้ก่อนวิเคราะห์",
  502: "ระบบได้รับผลการวิเคราะห์ที่ไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง",
  503: "ระบบวิเคราะห์ตำแหน่งงานไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง",
  504: "การวิเคราะห์ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง",
};

const JOB_MATCHING_SOURCE_LABELS = {
  skills: "ทักษะ",
  resume: "Resume",
};

const JOB_MATCHING_CODE_ERRORS = {
  MATCH_PROFILE_TEXT_REQUIRED: "กรุณาบันทึกทักษะคอมพิวเตอร์หรือทักษะที่เกี่ยวข้องก่อนวิเคราะห์จากทักษะ",
  MATCH_RESUME_TEXT_REQUIRED: "กรุณาอัปโหลด Resume ที่ระบบสามารถอ่านข้อความได้ก่อนวิเคราะห์จาก Resume",
  MATCH_SOURCE_INVALID: "เลือกแหล่งข้อมูลสำหรับวิเคราะห์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
};

async function loadJobMatches(source) {
  if (isJobMatchingLoading) {
    return;
  }
  isJobMatchingLoading = true;
  jobMatchingRetrySource = source;
  if (jobMatchingRetry) jobMatchingRetry.hidden = true;
  const sourceVersion = jobMatchingSourceVersion, sessionToken = getStudentToken();
  const sourceChanged = () => sessionToken !== getStudentToken()
    || sourceVersion !== jobMatchingSourceVersion;
  lastMatchingSource = null;
  jobMatchingResults.replaceChildren();
  renderMatchingAnalysis(jobMatchingAnalysis, null);
  jobMatchingResultSource.hidden = true;
  jobMatchingResultSource.textContent = "";
  jobMatchingResults.classList.remove("job-matching-content-in");
  jobMatchingEmpty.classList.remove("job-matching-content-in");
  jobMatchingMessage.classList.remove("job-matching-content-in");
  jobMatchingLoading.hidden = false;
  stopJobMatchingProgress();
  const sourceLabel = JOB_MATCHING_SOURCE_LABELS[source];
  const loadingText = source === "resume"
    ? "กำลังวิเคราะห์จาก Resume..."
    : "กำลังวิเคราะห์จากทักษะ...";
  jobMatchingLoadingTitle.textContent = loadingText;
  jobMatchingLoadingCaption.textContent = source === "resume"
    ? "กำลังใช้ข้อความที่อ่านได้จาก Resume เพื่อจับคู่ตำแหน่งงาน"
    : "กำลังใช้ทักษะที่บันทึกไว้ในประวัตินักศึกษา";
  jobMatchingEmpty.hidden = true;
  jobMatchingResults.setAttribute("aria-busy", "true");
  setButtonLoading(jobMatchingSkillsBtn, true, source === "skills" ? "กำลังวิเคราะห์ทักษะ..." : "วิเคราะห์จากทักษะ");
  setButtonLoading(jobMatchingResumeBtn, true, source === "resume" ? "กำลังวิเคราะห์ Resume..." : "วิเคราะห์จาก Resume");
  renderJobMatchingSource();
  showMessage(jobMatchingMessage, loadingText, "loading");

  try {
    const result = await getMyJobMatches({ source });
    if (sourceChanged()) return;
    if (!Array.isArray(result?.matches)) {
      throw new Error("Invalid matching response");
    }
    if (sourceChanged()) return;
    if (result.matching_source) {
      if (!Array.isArray(result.matching_source?.computer_skills)) throw new Error("Invalid matching source");
      // Render the exact persisted projection used for this analysis, including
      // changes committed in another tab since the panel was opened.
      ++jobMatchingSourceSequence;
      savedJobMatchingSource = result.matching_source;
      jobMatchingSourceState = "ready";
      renderJobMatchingSource();
    }
    lastMatchingSource = source;
    jobMatchingResultSource.textContent = `วิเคราะห์จาก: ${sourceLabel}`;
    jobMatchingResultSource.hidden = false;
    renderMatchingAnalysis(jobMatchingAnalysis, result.matching_analysis);
    renderJobMatches(result.matches);
    jobMatchingLoading.hidden = true;
    jobMatchingResults.classList.add("job-matching-content-in");
    jobMatchingEmpty.hidden = result.matches.length !== 0;
    if (!result.matches.length) {
      jobMatchingEmpty.classList.add("job-matching-content-in");
    }
    clearMessage(jobMatchingMessage);
    if (result.matches.length) {
      showMessage(jobMatchingMessage, `วิเคราะห์จาก${sourceLabel}เสร็จแล้ว พบตำแหน่งงานตามคะแนนความคล้ายข้อความ ${result.matches.length} ตำแหน่ง`, "success");
    } else {
      const noCandidates = result.matching_analysis?.candidate_job_count === 0 || result.matching_analysis?.computed === false;
      const message = noCandidates
        ? "ยังไม่มีประกาศที่พร้อมวิเคราะห์"
        : "วิเคราะห์เสร็จแล้ว แต่ยังไม่มีประกาศที่มีคะแนนความสอดคล้องของข้อความถึงเกณฑ์แนะนำ";
      jobMatchingEmpty.querySelector("h4").textContent = message;
      jobMatchingEmpty.querySelector("p").textContent = noCandidates
        ? "ลองค้นหาประกาศทั้งหมดด้านล่าง หรือลองวิเคราะห์อีกครั้งเมื่อมีประกาศที่พร้อมใช้งาน"
        : "ลองตรวจสอบทักษะที่บันทึกไว้ หรือค้นหาประกาศทั้งหมดด้านล่าง ผลนี้ไม่ใช่การตัดสินคุณสมบัติ";
      showMessage(jobMatchingMessage, message, "info");
    }
    jobMatchingMessage.classList.add("job-matching-content-in");
  } catch (error) {
    if (sourceChanged()) return;
    stopJobMatchingProgress();
    jobMatchingLoading.hidden = true;
    jobMatchingResults.replaceChildren();
    renderMatchingAnalysis(jobMatchingAnalysis, null);
    jobMatchingResultSource.hidden = true;
    if (jobMatchingRetry) jobMatchingRetry.hidden = false;
    if (error.status === 401) {
      clearAuthentication();
      redirectToLogin();
      return;
    }
    showMessage(
      jobMatchingMessage,
      JOB_MATCHING_CODE_ERRORS[error.data?.code] || JOB_MATCHING_ERRORS[error.status] || "การวิเคราะห์เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
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
    renderJobMatchingSource();
  }
}

jobMatchingSkillsBtn?.addEventListener("click", () => loadJobMatches("skills"));
jobMatchingResumeBtn?.addEventListener("click", () => loadJobMatches("resume"));
jobMatchingRetry?.addEventListener("click", async () => {
  if (jobMatchingRetrySource === "skills" && jobMatchingSourceState !== "ready") await refreshJobMatchingSource();
  if (jobMatchingRetrySource !== "skills" || jobMatchingSourceState === "ready") loadJobMatches(jobMatchingRetrySource);
});
document.getElementById("editJobMatchingProfileBtn")?.addEventListener("click", () => {
  document.querySelector('.sidebar-item[data-target="panel-profile"]')?.click();
});

// General browsing is independent from scored recommendations and requires no skills.
let jobBrowserSequence = 0;
let jobBrowserPage = 1;
let jobBrowserLoading = false;
const jobBrowserForm = document.getElementById("jobBrowserForm");
const jobBrowserResults = document.getElementById("jobBrowserResults");
const jobBrowserMessage = document.getElementById("jobBrowserMessage");
const jobBrowserPrevious = document.getElementById("jobBrowserPrevious");
const jobBrowserNext = document.getElementById("jobBrowserNext");
const jobProvinceNames = addressOptions({}, "province");
const jobProvinceOptions = document.getElementById("jobProvinceOptions");
if (jobProvinceOptions) jobProvinceOptions.replaceChildren(...["ทุกจังหวัด", ...jobProvinceNames].map(name => {
  const option = document.createElement("option"); option.value = name; return option;
}));

function resetJobBrowser() {
  ++jobBrowserSequence;
  jobBrowserLoading = false;
  jobBrowserPage = 1;
  jobBrowserResults?.replaceChildren();
  jobBrowserResults?.setAttribute("aria-busy", "false");
  jobBrowserPrevious.disabled = true; jobBrowserNext.disabled = true;
  setButtonLoading(jobBrowserForm?.querySelector('button[type="submit"]'), false, "กำลังค้นหา...", "ค้นหาประกาศ");
  clearMessage(jobBrowserMessage);
  setText(document.getElementById("jobBrowserPage"), "");
}

async function loadJobBrowser(page = 1) {
  if (!jobBrowserForm) return;
  const sequence = ++jobBrowserSequence, token = getStudentToken();
  const filters = new FormData(jobBrowserForm);
  const enteredProvince = String(filters.get("province") || "").trim().replace(/^(?:จังหวัด\s*|จ\.\s*)/u, "").trim();
  const province = ["กรุงเทพ", "กรุงเทพฯ", "กทม", "กทม."].includes(enteredProvince) ? "กรุงเทพมหานคร" : enteredProvince === "ทุกจังหวัด" ? "" : enteredProvince;
  if (province && !jobProvinceNames.includes(province)) {
    resetJobBrowser();
    showMessage(jobBrowserMessage, "กรุณาเลือกจังหวัดจากรายการ 77 จังหวัด หรือล้างเพื่อค้นหาทุกจังหวัด", "error");
    return;
  }
  jobBrowserLoading = true;
  jobBrowserResults.replaceChildren();
  jobBrowserResults.setAttribute("aria-busy", "true");
  jobBrowserPrevious.disabled = true; jobBrowserNext.disabled = true;
  const searchButton = jobBrowserForm.querySelector('button[type="submit"]');
  setButtonLoading(searchButton, true, "กำลังค้นหา...", "ค้นหาประกาศ");
  showMessage(jobBrowserMessage, "กำลังค้นหาประกาศ...", "loading");
  try {
    const result = await getPublishedJobs({ q: filters.get("q"), category: filters.get("category"), specialization: filters.get("specialization") || "", province, page });
    if (sequence !== jobBrowserSequence || token !== getStudentToken()) return;
    if (!Array.isArray(result.jobs)) throw new Error("ข้อมูลประกาศไม่สมบูรณ์ กรุณาลองใหม่");
    jobBrowserPage = result.page;
    jobBrowserResults.replaceChildren(...result.jobs.map((job) => createJobCard(job, { recommendation: false, canWrite: canUseCoopFeatures(currentStudent) })));
    jobBrowserPrevious.disabled = result.page <= 1;
    jobBrowserNext.disabled = result.page * result.limit >= result.total;
    setText(document.getElementById("jobBrowserPage"), `หน้า ${result.page} · ${result.total} ประกาศ`);
    showMessage(jobBrowserMessage, result.jobs.length ? `พบ ${result.total} ประกาศตามเงื่อนไขค้นหา` : "ไม่พบประกาศตามเงื่อนไข ลองเปลี่ยนคำค้นหาหรือตัวกรอง", "info");
  } catch (error) {
    if (sequence !== jobBrowserSequence || token !== getStudentToken()) return;
    if (error.status === 401) { clearAuthentication(); redirectToLogin(); return; }
    showMessage(jobBrowserMessage, error.message || "ค้นหาประกาศไม่สำเร็จ กรุณากดค้นหาอีกครั้ง", "error");
  } finally {
    if (sequence === jobBrowserSequence) {
      jobBrowserLoading = false;
      jobBrowserResults.setAttribute("aria-busy", "false");
      setButtonLoading(searchButton, false, "กำลังค้นหา...", "ค้นหาประกาศ");
    }
  }
}
jobBrowserForm?.addEventListener("submit", (event) => { event.preventDefault(); if (!jobBrowserLoading) loadJobBrowser(1); });
for (const event of ["input", "change", "reset"]) jobBrowserForm?.addEventListener(event, () => {
  resetJobBrowser();
  showMessage(jobBrowserMessage, "ตัวกรองเปลี่ยนแล้ว กดค้นหาเพื่อดูประกาศจากหน้าแรก", "info");
});
jobBrowserPrevious?.addEventListener("click", () => { if (!jobBrowserLoading) loadJobBrowser(Math.max(1, jobBrowserPage - 1)); });
jobBrowserNext?.addEventListener("click", () => { if (!jobBrowserLoading) loadJobBrowser(jobBrowserPage + 1); });

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
let companySearchSequence = 0;
let companyDuplicateSequence = 0;
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
const closeCoopRequestDetailFooterBtn = document.getElementById("closeCoopRequestDetailFooterBtn");
const coopCreateFocus = profileModalFocus(coopRequestModal, createRequestBtn);
const coopDetailFocus = profileModalFocus(coopRequestDetailModal, viewCurrentCoopRequestBtn);

let coopRequests = [];
let currentCoopRequest = null;
let coopRequestsLoading = false;
let coopRequestsLoaded = false;
let coopRequestsLoadError = false;
let coopRequestSubmitting = false;
let coopRequestCancelling = false;
let coopRequestDetailLoading = false;
let coopRequestDetailId = null;
let coopRequestDetailSequence = 0;
let coopRequestModalReturnFocus = null;
let coopRequestDetailModalReturnFocus = null;

// Student.major is the saved Profile source; unsaved Profile edits are not used.
const COOP_PREREQUISITE_COURSES = { IT: [], INE: [] };
const COOP_GRADE_OPTIONS = ["A", "B+", "B", "C+", "C", "D+", "D", "F"];
const coopPrerequisiteCourses = document.getElementById("coopPrerequisiteCourses");
const coopPrerequisiteContext = document.getElementById("coopPrerequisiteContext");
let coopPrerequisiteProgram = null;
let coopPrerequisiteState = new Map();
let coopAcademicDetail;
let coopCatalogLoading = false;
let coopCatalogError = null;
let coopCatalogRevision = null;
let coopCatalogSequence = 0;
let coopClassAdvisor = null;
let coopClassAdvisorLoading = false;
let coopClassAdvisorSequence = 0;
let coopHeadContext = null;
let coopHeadLoading = false;
let coopHeadError = null;
let coopHeadSequence = 0;
let coopRequestHasDraft = false;

function renderCoopPreviewHead() {
  renderCoopHeadApproval({ department_head: coopHeadContext }, document.getElementById('coopPreviewHeadApproval'), {
    loading: coopHeadLoading, error: coopHeadError, preview: true,
  });
}

async function loadCoopDepartmentHead() {
  const sequence = ++coopHeadSequence, token = getStudentToken();
  coopHeadLoading = true; coopHeadError = null; coopHeadContext = null;
  renderCoopPreviewHead();
  try {
    const result = await getDepartmentHead();
    if (sequence !== coopHeadSequence || token !== getStudentToken()) return;
    if (!result?.data || typeof result.data.resolution !== 'string') throw Error('ข้อมูลหัวหน้าภาควิชาไม่ถูกต้อง กรุณาลองอีกครั้ง');
    coopHeadContext = result.data;
  } catch (error) {
    if (sequence !== coopHeadSequence || token !== getStudentToken()) return;
    coopHeadError = getCoopRequestErrorMessage(error, 'โหลดข้อมูลหัวหน้าภาควิชา');
  } finally {
    if (sequence === coopHeadSequence) { coopHeadLoading = false; renderCoopPreviewHead(); }
  }
}

function coopAdvisorWarning() {
  if (hasAdvisorSelectionChanged) return 'มีการเปลี่ยนอาจารย์ที่ยังไม่ได้บันทึก กรุณาบันทึกในเมนูประวัตินักศึกษาก่อนยื่นคำร้อง ข้อมูลคำร้องที่กรอกยังอยู่';
  if (coopClassAdvisorLoading) return 'กำลังตรวจสอบอาจารย์ที่ปรึกษาประจำชั้นที่บันทึกไว้...';
  return coopClassAdvisor?.ready ? null : coopClassAdvisor?.message || 'กรุณาโหลดข้อมูลอาจารย์ที่ปรึกษาประจำชั้นก่อนยื่นคำร้อง';
}

function renderCoopClassAdvisor() {
  setText(coopAdvisorName, coopClassAdvisor?.advisor ? formatTeacherName(coopClassAdvisor.advisor) : coopClassAdvisorLoading ? 'กำลังตรวจสอบข้อมูลที่บันทึกไว้' : 'ยังไม่มีข้อมูลอาจารย์ที่พร้อมพิจารณา');
  const warning = coopAdvisorWarning();
  const status = document.getElementById('coopClassAdvisorStatus');
  setText(status, warning || '');
  if (status) status.hidden = !warning;
  const retry = document.getElementById('coopClassAdvisorRetry');
  if (retry) { retry.hidden = Boolean(coopClassAdvisor?.ready); retry.disabled = coopClassAdvisorLoading || coopRequestSubmitting; }
  if (saveCoopRequestBtn) saveCoopRequestBtn.disabled = coopRequestSubmitting || Boolean(coopAdvisorWarning()) || coopCatalogLoading || Boolean(coopCatalogError) || !coopCatalogRevision;
}

async function loadCoopClassAdvisor() {
  const sequence = ++coopClassAdvisorSequence, token = getStudentToken();
  coopClassAdvisorLoading = true; coopClassAdvisor = null; renderCoopClassAdvisor();
  try {
    const result = await getClassAdvisorReadiness();
    if (sequence !== coopClassAdvisorSequence || token !== getStudentToken()) return;
    if (typeof result?.data?.ready !== 'boolean') throw Error('ข้อมูลอาจารย์ที่ปรึกษาไม่ถูกต้อง กรุณาลองอีกครั้ง');
    coopClassAdvisor = result.data;
  } catch (error) {
    if (sequence !== coopClassAdvisorSequence || token !== getStudentToken()) return;
    coopClassAdvisor = { ready: false, message: error.message || 'ตรวจสอบอาจารย์ที่ปรึกษาไม่สำเร็จ กรุณาลองอีกครั้ง' };
  } finally {
    if (sequence === coopClassAdvisorSequence) { coopClassAdvisorLoading = false; renderCoopClassAdvisor(); }
  }
}

document.getElementById('coopClassAdvisorRetry')?.addEventListener('click', loadCoopClassAdvisor);

async function loadCoopPrerequisiteCatalog() {
  const selectedProgram = coopPrerequisiteProgram, sequence = ++coopCatalogSequence;
  if (!selectedProgram) { coopCatalogLoading = false; coopCatalogRevision = null; coopCatalogError = "กรุณาตรวจสอบสาขา IT / INE ในประวัตินักศึกษา"; renderCoopPrerequisiteCourses(); return; }
  coopCatalogLoading = true; coopCatalogError = null; renderCoopPrerequisiteCourses();
  try {
    const result = await getCoopPrerequisiteCatalog(), catalog = result?.data;
    if (sequence !== coopCatalogSequence || selectedProgram !== coopPrerequisiteProgram) return;
    if (catalog?.program !== selectedProgram || !Array.isArray(catalog.courses) || typeof catalog.revision !== "string") throw new Error("ข้อมูลรายวิชาไม่ตรงกับสาขาปัจจุบัน กรุณาโหลดประวัติใหม่");
    COOP_PREREQUISITE_COURSES[selectedProgram] = catalog.courses;
    coopCatalogRevision = catalog.revision;
  } catch (error) {
    if (sequence !== coopCatalogSequence) return;
    coopCatalogError = error.message || "ไม่สามารถโหลดรายวิชาได้ กรุณาลองอีกครั้ง";
  } finally {
    if (sequence === coopCatalogSequence) { coopCatalogLoading = false; renderCoopPrerequisiteCourses(); }
  }
}

function syncCoopPrerequisiteProgram(reset = false) {
  const major = currentStudent?.major;
  const program = major === "IT" || major === "INE" ? major : null;
  if (reset || program !== coopPrerequisiteProgram) {
    coopPrerequisiteProgram = program;
    // Discard old course state rather than reusing positional values across programs.
    coopPrerequisiteState = new Map();
    coopCatalogRevision = null;
    renderCoopPrerequisiteCourses();
    loadCoopPrerequisiteCatalog();
  }
}

function getCoopPrerequisiteData() {
  syncCoopPrerequisiteProgram();
  return (COOP_PREREQUISITE_COURSES[coopPrerequisiteProgram] || []).map((course) => {
    const state = coopPrerequisiteState.get(course.course_code);
    const status = ['passed', 'studying', 'failed', 'unselected'].includes(state?.status) ? state.status : null;
    return {
      course_code: course.course_code,
      course_name: course.course_name,
      status,
      grade: ['passed', 'failed'].includes(status) ? String(state?.grade || "").trim() || null : null,
    };
  });
}

function renderCoopPrerequisiteCourses() {
  if (!coopPrerequisiteCourses) return;
  coopPrerequisiteCourses.replaceChildren();
  const courses = COOP_PREREQUISITE_COURSES[coopPrerequisiteProgram] || [];
  const retry = document.getElementById("coopCatalogRetry");
  if (retry) { retry.hidden = !coopCatalogError; retry.disabled = coopCatalogLoading || coopRequestSubmitting; }
  renderCoopClassAdvisor();
  coopPrerequisiteCourses.setAttribute("aria-busy", String(coopCatalogLoading));
  setText(coopPrerequisiteContext, coopPrerequisiteProgram === "IT"
    ? "สำหรับหลักสูตรวิทยาศาสตรบัณฑิต (IT)"
    : coopPrerequisiteProgram === "INE" ? "สำหรับหลักสูตรวิศวกรรมศาสตรบัณฑิต (INE)" : "ไม่พบสาขา IT / INE ในข้อมูลประวัตินักศึกษา");
  if (coopCatalogLoading || coopCatalogError || !courses.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = coopCatalogLoading ? "กำลังโหลดรายวิชาที่ใช้งาน..." : coopCatalogError || "ไม่มีรายวิชาที่เปิดใช้งานในสาขานี้";
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
    const grade = document.createElement("select");
    grade.id = `coop-grade-${code}`;
    grade.setAttribute("aria-label", `ผลการเรียน ${code}`);
    for (const value of ["", ...COOP_GRADE_OPTIONS]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value || "เลือกผลการเรียน";
      grade.append(option);
    }
    if (state.grade && !COOP_GRADE_OPTIONS.includes(state.grade)) {
      const legacy = document.createElement("option");
      legacy.value = state.grade;
      legacy.textContent = `${state.grade} (ข้อมูลเดิม · กรุณาตรวจสอบ)`;
      legacy.disabled = true;
      grade.append(legacy);
    }
    grade.value = state.grade || "";
    const statusCell = document.createElement("td");
    const status = document.createElement("select");
    status.id = `coop-status-${code}`;
    status.setAttribute("aria-label", `สถานะ ${code}`);
    [["unselected", "ยังไม่ระบุ"], ["passed", "ผ่านแล้ว"], ["studying", "กำลังศึกษา"], ["failed", "ไม่ผ่าน"]].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      status.append(option);
    });
    status.value = state.status || "unselected";
    const updateGrade = () => {
      grade.required = ['passed', 'failed'].includes(state.status);
      grade.disabled = coopRequestSubmitting || !grade.required;
    };
    status.addEventListener("change", () => {
      // Ignore detached rows if Profile reloaded while an event was pending.
      if (coopPrerequisiteState.get(code) !== state) return;
      state.status = status.value || null;
      if (!['passed', 'failed'].includes(state.status) || state.status === 'passed' && state.grade === 'F' || state.status === 'failed' && state.grade !== 'F') { state.grade = null; grade.value = ""; }
      updateGrade();
    });
    grade.addEventListener("change", () => {
      if (coopPrerequisiteState.get(code) === state && ['passed', 'failed'].includes(state.status)) state.grade = grade.value;
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
  if (coopCatalogLoading || coopCatalogError || !coopCatalogRevision) return coopCatalogError || "กรุณารอให้โหลดรายวิชาสำเร็จก่อนยื่นคำร้อง";
  if (courses.some(course => course.status === 'failed' && course.grade !== 'F')) return 'สถานะไม่ผ่านต้องระบุผลการเรียน F';
  const missingGrade = courses.find((course) => course.status === "passed" && !course.grade?.trim());
  if (missingGrade) return `กรุณาระบุผลการเรียนของรายวิชา ${missingGrade.course_code} ที่ผ่านแล้ว`;
  const invalidGrade = courses.find(course => course.status === "passed" && !COOP_GRADE_OPTIONS.includes(course.grade));
  if (invalidGrade) return `ผลการเรียนของรายวิชา ${invalidGrade.course_code} เป็นข้อมูลเดิมที่ต้องตรวจสอบ กรุณาเลือกผลการเรียนที่รองรับก่อนยื่นคำร้องใหม่`;
  const failedCourse = courses.find(course => course.status === "passed" && course.grade === "F");
  return failedCourse ? `เกรด F ของรายวิชา ${failedCourse.course_code} ไม่สอดคล้องกับสถานะผ่านแล้ว กรุณาตรวจสอบผลการเรียน` : null;
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
  coopRequestHasDraft = false;
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

  const unavailable = !coopRequestsLoaded || coopRequestsLoadError;
  if (coopRequestEmpty) coopRequestEmpty.hidden = Boolean(currentCoopRequest) || coopRequestsLoading || unavailable;
  if (coopRequestCurrent) coopRequestCurrent.hidden = !currentCoopRequest;
  if (coopRequestHistory) coopRequestHistory.hidden = !coopRequestsLoaded;
  if (createRequestBtn) createRequestBtn.disabled = isBusy || unavailable;
  if (createAnotherCoopRequestBtn) createAnotherCoopRequestBtn.disabled = isBusy || unavailable;
  const refresh = document.getElementById('coopRequestsRefresh');
  if (refresh) refresh.disabled = isBusy;

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
    document.getElementById('coopCurrentAcademic')?.replaceChildren(academicSummaryNode(document, currentCoopRequest.academic));
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
  if (!canUseCoopFeatures(currentStudent)) return false;
  if (coopRequestsLoading || coopRequestSubmitting || coopRequestCancelling) return false;
  const token = getStudentToken();
  coopRequestsLoading = true;
  renderCoopRequests();
  showMessage(coopRequestMessage, "กำลังโหลดคำร้องสหกิจศึกษา...", "loading");
  try {
    const result = await getMyCoopRequests();
    if (!token || token !== getStudentToken()) return false;
    if (!Array.isArray(result?.data)) throw new Error("ข้อมูลคำร้องไม่ถูกต้อง");
    coopRequests = result.data;
    coopRequestsLoaded = true;
    coopRequestsLoadError = false;
    studentOverview.accept(coopRequests, token);
    clearMessage(coopRequestMessage);
    return true;
  } catch (error) {
    if (token !== getStudentToken()) return false;
    studentOverview.fail(token);
    coopRequestsLoadError = true;
    showMessage(coopRequestMessage, `${getCoopRequestErrorMessage(error, "โหลด")} ${coopRequestsLoaded ? 'ยังแสดงข้อมูลครั้งล่าสุด กรุณากดรีเฟรชคำร้อง' : 'กรุณากดรีเฟรชคำร้องก่อนยื่นคำร้องใหม่'}`, "error");
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
  syncCoopCompanyFieldOwnership(isSubmitting);
  renderCoopPrerequisiteCourses();
  setButtonLoading(
    saveCoopRequestBtn,
    isSubmitting,
    "กำลังยื่นคำร้อง...",
    "ยื่นคำร้อง",
  );
  renderCoopClassAdvisor();
}

function syncCoopCompanyFieldOwnership(isSubmitting = coopRequestSubmitting) {
  const canonicalCompany = Boolean(selectedCoopCompanyId);
  const name = document.getElementById("coopCompanyName");
  const province = document.getElementById("coopCompanyProvince");
  const address = document.getElementById("coopCompanyAddress");
  if (name) name.readOnly = canonicalCompany;
  if (address) address.readOnly = canonicalCompany;
  if (province) province.disabled = isSubmitting || canonicalCompany;
}

function applyCoopCompany(company, { preserveJob = false } = {}) {
  companySearchSequence++;
  companyDuplicateSequence++;
  if (!preserveJob) {
    selectedCoopJobPostingId = null;
    if (coopSelectedJobPosting) { coopSelectedJobPosting.hidden = true; coopSelectedJobPosting.textContent = ''; }
  }
  selectedCoopCompanyId = company?.id || null;
  const name = document.getElementById("coopCompanyName");
  const province = document.getElementById("coopCompanyProvince");
  const address = document.getElementById("coopCompanyAddress");
  name.value = company?.name || "";
  province.value = company?.province || "";
  if (company?.province && province.value !== company.province) {
    const option = document.createElement("option"); option.value = company.province; option.textContent = company.province; province.append(option); province.value = company.province;
  }
  const companyAddress = company ? [company.address_no, company.moo, company.subdistrict, company.district, company.province].filter(Boolean).join(" ") : "";
  address.value = company?.request_address || (company?.development_data ? `ข้อมูลจำลองสำหรับ Development: ${companyAddress}` : companyAddress);
  syncCoopCompanyFieldOwnership();
  if (coopCompanySearchResults) coopCompanySearchResults.replaceChildren();
  if (coopCompanyDuplicateMessage) coopCompanyDuplicateMessage.textContent = "";
}

function openCoopRequestModal() {
  if (!canUseCoopFeatures(currentStudent)) return;
  if (!coopRequestsLoaded || coopRequestsLoadError) {
    showToast('กรุณารีเฟรชคำร้องให้สำเร็จก่อนยื่นคำร้องใหม่', 'error');
    return false;
  }
  if (currentCoopRequest) {
    showDuplicateCoopRequestAlert();
    return false;
  }
  if (coopRequestSubmitting) return false;
  coopRequestModalReturnFocus = document.activeElement;
  renderReadonlyStudentData();
  if (!coopRequestHasDraft) {
    coopRequestForm?.reset();
    syncCoopPrerequisiteProgram(true);
    selectedCoopCompanyId = null;
    selectedCoopJobPostingId = null;
    if (coopCompanySearch) coopCompanySearch.value = "";
    if (coopSelectedJobPosting) { coopSelectedJobPosting.hidden = true; coopSelectedJobPosting.textContent = ""; }
    applyCoopCompany(null);
  } else {
    syncCoopPrerequisiteProgram();
    loadCoopPrerequisiteCatalog();
  }
  coopRequestHasDraft = true;
  // Display-only date for the draft form; persisted submission/review dates
  // continue to come from the request API and are never replaced with today.
  setText(document.getElementById('coopRequestFormDate'), new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok', calendar: 'buddhist', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date()));
  loadCoopClassAdvisor();
  loadCoopDepartmentHead();
  clearMessage(coopRequestFormMessage);
  setCoopRequestFormSubmitting(false);
  coopCreateFocus.open();
  coopRequestModal?.classList.add("open");
  coopRequestModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.requestAnimationFrame(() => document.getElementById("coopCompanyName")?.focus());
  return true;
}

function closeCoopRequestModal() {
  if (coopRequestSubmitting) return;
  coopHeadSequence++;
  coopHeadLoading = false;
  companySearchSequence++;
  companyDuplicateSequence++;
  coopRequestModal?.classList.remove("open");
  coopRequestModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  coopCreateFocus.close();
  coopRequestModalReturnFocus?.focus?.();
  coopRequestModalReturnFocus = null;
}

function getCoopRequestFormData() {
  return {
    prerequisite_courses: getCoopPrerequisiteData(),
    prerequisite_catalog_revision: coopCatalogRevision,
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
  const advisorWarning = coopAdvisorWarning();
  if (advisorWarning) { renderCoopClassAdvisor(); showMessage(coopRequestFormMessage, advisorWarning, 'error'); return; }
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
    if (error.data?.code?.startsWith('CLASS_ADVISOR_')) {
      coopClassAdvisor = { ready: false, code: error.data.code, message: error.message };
      renderCoopClassAdvisor();
      showMessage(coopRequestFormMessage, error.message, 'error');
      showToast(error.message, 'error');
      return;
    }
    if (error.data?.code === "COOP_PREREQUISITE_CATALOG_CHANGED") {
      coopRequestSubmitting = false;
      await loadCoopPrerequisiteCatalog();
      showMessage(coopRequestFormMessage, "รายการรายวิชาเปลี่ยนแปลงแล้ว ข้อมูลที่กรอกยังอยู่ กรุณาตรวจสอบรายวิชาและยื่นอีกครั้ง", "error");
      return;
    }
    if (error.data?.code === "COOP_PREREQUISITE_CATALOG_SCHEMA_REQUIRED") {
      showMessage(coopRequestFormMessage, error.message || "Catalog ยังไม่พร้อม กรุณาติดต่อผู้ดูแล", "error");
      return;
    }
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
  if (coopRequestDetailLoading || coopAcademicDetail?.busy) return;
  coopRequestDetailId = null;
  coopRequestDetailSequence++;
  coopAcademicDetail?.dispose(); coopAcademicDetail = null;
  coopRequestDetailModal?.classList.remove("open");
  coopRequestDetailModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  coopDetailFocus.close();
  coopRequestDetailModalReturnFocus?.focus?.();
  coopRequestDetailModalReturnFocus = null;
}

function renderCoopRequestDetail(request) {
  renderCoopPrerequisiteSnapshot(request.prerequisite_courses);
  renderCoopHeadApproval(request);
  renderCoopAdvisorApproval(request);
  renderCoopReviewHistory(request);
  coopAcademicDetail?.dispose();
  const academicRoot = document.getElementById('coopAcademicDetail'), academicToken = getStudentToken();
  if (academicRoot) coopAcademicDetail = mountAcademicCourses({ document, root: academicRoot, request, editable: true,
    isLive: () => getStudentToken() === academicToken && Boolean(academicToken),
    onSaved: academic => { const row = coopRequests.find(row => row.id === request.id); if (row) row.academic = academic; renderCoopRequests(); } });
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
  const cancellation = [...(request.reviews || [])].reverse().find(review => review.decision === "cancel");
  if (request.status === "cancelled" && cancellation) {
    coopDetailRequest.append(
      createCoopDetailItem("เหตุผลการยกเลิก", cancellation.reason, true),
      createCoopDetailItem("ผู้ยกเลิก", cancellation.actor_role === "department_staff" ? "เจ้าหน้าที่ภาควิชา" : "นักศึกษา"),
      createCoopDetailItem("ยกเลิกเมื่อ", formatCoopDate(request.cancelled_at)),
    );
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
  if (coopDetailStatus) {
    coopDetailStatus.className = `coop-status-badge is-${request.status}`;
    coopDetailStatus.textContent = status.label;
  }
  renderCoopStepper(coopDetailStepper, request);
}

function renderCoopAdvisorApproval(request) {
  const target = document.getElementById('coopDetailAdvisorApproval');
  if (!target) return;
  const review = [...(request.reviews || [])].reverse().find(row => row.actor_role === 'teacher' && ['approve', 'reject'].includes(row.decision));
  target.replaceChildren(
    createCoopDetailItem('อาจารย์ที่ปรึกษาประจำชั้นปัจจุบัน', getCoopAdvisorName(request.student)),
    createCoopDetailItem('ผลการพิจารณา', review ? review.decision === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ' : 'ยังไม่มีประวัติการพิจารณา'),
    createCoopDetailItem('ผู้พิจารณา', review?.teacher ? formatTeacherName(review.teacher) : 'ยังไม่มีข้อมูล'),
    createCoopDetailItem('วันที่พิจารณา', review ? formatCoopDate(review.created_at || review.createdAt, true) : 'ยังไม่มีข้อมูล'),
    createCoopDetailItem('เหตุผล / ความเห็น', review?.reason || 'ไม่ได้ระบุความเห็น', true),
  );
}

function renderCoopReviewHistory(request) {
  const target = document.getElementById('coopDetailReviewHistory');
  if (!target) return;
  const roles = { student: 'นักศึกษา', teacher: 'อาจารย์ที่ปรึกษาประจำชั้น', department_head: 'หัวหน้าภาควิชา', department_staff: 'เจ้าหน้าที่' };
  const decisions = { submit: 'ยื่นคำร้อง', approve: 'อนุมัติ', reject: 'ไม่อนุมัติ', cancel: 'ยกเลิก' };
  target.replaceChildren();
  for (const review of request.reviews || []) {
    const row = document.createElement('li');
    row.textContent = `${formatCoopDate(review.created_at || review.createdAt, true)} · ${roles[review.actor_role] || 'ไม่พบข้อมูลบทบาท'}${review.teacher ? ` (${formatTeacherName(review.teacher)})` : ''} · ${decisions[review.decision] || review.decision} · ${review.from_status === 'new' ? 'เริ่มคำร้อง' : getCoopRequestStatusMeta(review.from_status).label} → ${getCoopRequestStatusMeta(review.to_status).label}${review.reason ? ` · ${review.reason}` : ''}`;
    target.append(row);
  }
  if (!target.children.length) { const row = document.createElement('li'); row.textContent = 'ยังไม่มีประวัติการดำเนินการ'; target.append(row); }
}

function renderCoopHeadApproval(request, target = document.getElementById("coopDetailHeadApproval"), { loading = false, error = null, preview = false } = {}) {
  if (!target) return;
  target.setAttribute('aria-busy', String(loading));
  if (loading || error) {
    target.replaceChildren(createCoopDetailItem('ข้อมูลหัวหน้าภาควิชา', loading ? 'กำลังโหลดข้อมูลหัวหน้าภาควิชา...' : error, true));
    return;
  }
  const context = request.department_head;
  const head = context?.current_responsible_head;
  const missingHead = context?.resolution === 'ambiguous'
    ? 'ไม่มีข้อมูลผู้รับผิดชอบที่ระบุได้แน่ชัด พบหัวหน้าภาควิชาหลายคน กรุณาติดต่อเจ้าหน้าที่'
    : 'ไม่มีข้อมูลผู้รับผิดชอบ';
  target.replaceChildren(
    createCoopDetailItem('หัวหน้าภาควิชาผู้รับผิดชอบปัจจุบัน', head ? formatTeacherName(head) : missingHead, true),
    createCoopDetailItem('ตำแหน่งผู้รับผิดชอบปัจจุบัน', head?.position || 'ไม่มีข้อมูลตำแหน่ง'),
    createCoopDetailItem('ภาควิชาที่รับผิดชอบ', context?.department || 'ไม่มีข้อมูลภาควิชา'),
  );
  if (preview) return;
  const reviews = Array.isArray(request.reviews) ? request.reviews : [];
  // API orders the persisted history by created_at then id; never infer a vote.
  const review = [...reviews].reverse().find(row => row.actor_role === "department_head" && ["approve", "reject"].includes(row.decision));
  if (review) {
    const name = review.teacher ? formatTeacherName(review.teacher) : "ไม่พบข้อมูลชื่อผู้พิจารณา";
    target.append(
      createCoopDetailItem("สถานะการพิจารณา", "พิจารณาแล้ว"),
      createCoopDetailItem("ผลการพิจารณา", review.decision === "approve" ? "อนุมัติ" : "ไม่อนุมัติ"),
      createCoopDetailItem("หัวหน้าภาควิชาผู้พิจารณา", name),
      createCoopDetailItem("ตำแหน่งผู้พิจารณา (ข้อมูลปัจจุบัน)", review.teacher?.position || 'ไม่มีข้อมูลตำแหน่ง'),
      createCoopDetailItem("วันที่พิจารณา", formatCoopDate(review.created_at || review.createdAt, true)),
      createCoopDetailItem("เหตุผล / ความเห็น", typeof review.reason === "string" && review.reason.trim() ? review.reason : "ไม่ได้ระบุความเห็น", true),
    );
    return;
  }
  const message = request.status === "department_head_review" ? "รอการพิจารณาจากหัวหน้าภาควิชา"
    : !request.status || ["submitted", "staff_review", "advisor_review"].includes(request.status) ? "ยังไม่ถึงขั้นตอนพิจารณาของหัวหน้าภาควิชา"
    : request.status === "cancelled" ? "คำร้องถูกยกเลิกแล้ว ไม่พบประวัติการพิจารณาของหัวหน้าภาควิชา"
    : request.status === "rejected" ? "คำร้องไม่ผ่านการอนุมัติ ไม่พบประวัติการพิจารณาของหัวหน้าภาควิชา"
    : "ไม่พบประวัติการพิจารณาของหัวหน้าภาควิชาในข้อมูลคำร้องนี้";
  target.append(createCoopDetailItem("สถานะการพิจารณา", message, true));
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
  const labels = {passed: 'ผ่านแล้ว', studying: 'กำลังศึกษา', failed: 'ไม่ผ่าน', unselected: 'ยังไม่ระบุ'};
  [...courses].sort((a,b) => String(a.course_code).localeCompare(String(b.course_code))).forEach(course => {
    const row = document.createElement('tr'); row.dataset.courseCode = course.course_code;
    for (const value of [`${course.course_code} ${course.course_name}${course.english_name ? ` (${course.english_name})` : ''}`, course.grade || '-', labels[course.status] || 'สถานะเดิมที่ต้องตรวจสอบ']) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    body.append(row);
  });
}

async function openCoopRequestDetail(id) {
  if (!id || coopRequestDetailLoading || coopAcademicDetail?.busy) return;
  if (!coopRequestDetailModal?.classList.contains('open')) coopRequestDetailModalReturnFocus = document.activeElement;
  coopDetailFocus.open();
  coopRequestDetailModal?.classList.add("open");
  coopRequestDetailModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.requestAnimationFrame(() => closeCoopRequestDetailModalBtn?.focus());
  coopRequestDetailLoading = true;
  coopRequestDetailId = id;
  const sequence = ++coopRequestDetailSequence, token = getStudentToken();
  const retry = document.getElementById('coopRequestDetailRetry');
  if (retry) { retry.hidden = true; retry.disabled = true; }
  coopRequestDetailContent?.setAttribute("aria-busy", "true");
  coopRequestDetailData.hidden = true;
  showMessage(coopRequestDetailMessage, "กำลังโหลดรายละเอียดคำร้อง...", "loading");
  try {
    const result = await getCoopRequestById(id);
    if (sequence !== coopRequestDetailSequence || token !== getStudentToken()) return;
    renderCoopRequestDetail(result?.data || {});
    clearMessage(coopRequestDetailMessage);
    coopRequestDetailData.hidden = false;
    if (retry) { retry.textContent = 'รีเฟรชรายละเอียด'; retry.hidden = false; }
  } catch (error) {
    if (sequence !== coopRequestDetailSequence || token !== getStudentToken()) return;
    showMessage(coopRequestDetailMessage, getCoopRequestErrorMessage(error, "โหลดรายละเอียด"), "error");
    if (retry) { retry.textContent = 'ลองโหลดรายละเอียดอีกครั้ง'; retry.hidden = false; }
  } finally {
    if (sequence === coopRequestDetailSequence) {
      coopRequestDetailLoading = false;
      coopRequestDetailContent?.setAttribute("aria-busy", "false");
      if (retry) retry.disabled = false;
    }
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
document.getElementById('coopRequestsRefresh')?.addEventListener('click', loadCoopRequests);
document.getElementById("coopCatalogRetry")?.addEventListener("click", loadCoopPrerequisiteCatalog);
createAnotherCoopRequestBtn?.addEventListener("click", openCoopRequestModal);
coopCompanySearch?.addEventListener("input", () => {
  window.clearTimeout(companySearchTimer);
  const sequence = ++companySearchSequence;
  const query = coopCompanySearch.value.trim();
  coopCompanySearchResults.replaceChildren();
  companySearchTimer = window.setTimeout(async () => {
    if (query.length < 2) { coopCompanySearchResults.replaceChildren(); return; }
    try {
      const result = await searchCompanies(query);
      if (sequence !== companySearchSequence || coopCompanySearch.value.trim() !== query || !coopRequestModal?.classList.contains('open')) return;
      const rows = (result?.data || []).map((company) => {
        const row = document.createElement("div"); row.className = "coop-company-result";
        const details = document.createElement("span"); details.textContent = `${company.name} — ${company.province}${company.development_data ? " — ข้อมูลจำลองสำหรับ Development" : ""}`;
        const select = document.createElement("button"); select.type = "button"; select.className = "btn-secondary"; select.textContent = "เลือก";
        select.addEventListener("click", () => applyCoopCompany(company)); row.append(details, select); return row;
      });
      if (!rows.length) { const empty = document.createElement("p"); empty.textContent = "ไม่พบข้อมูลบริษัท คุณสามารถกรอกข้อมูลเองได้"; rows.push(empty); }
      coopCompanySearchResults.replaceChildren(...rows);
    } catch (error) { if (sequence === companySearchSequence) showToast(error.message || "ค้นหาบริษัทไม่สำเร็จ", "error"); }
  }, 250);
});
coopManualCompanyBtn?.addEventListener("click", () => { selectedCoopCompanyId = null; applyCoopCompany(null); document.getElementById("coopCompanyName")?.focus(); });
document.getElementById("coopCompanyName")?.addEventListener("blur", async (event) => {
  if (selectedCoopCompanyId || !event.target.value.trim()) return;
  const query = event.target.value.trim(), sequence = ++companyDuplicateSequence;
  try {
    const result = await checkCompanyDuplicate(query);
    if (sequence !== companyDuplicateSequence || selectedCoopCompanyId || event.target.value.trim() !== query || !coopRequestModal?.classList.contains('open')) return;
    const duplicates = result?.data || [];
    if (!duplicates.length) { coopCompanyDuplicateMessage.textContent = "ไม่พบชื่อบริษัทซ้ำ สามารถดำเนินการต่อได้"; return; }
    coopCompanyDuplicateMessage.replaceChildren(document.createTextNode("พบชื่อบริษัทที่อาจซ้ำ: "));
    duplicates.forEach((company) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "btn-secondary";
      button.textContent = `ใช้ ${company.name} (${company.province})${company.development_data ? " — ข้อมูลจำลองสำหรับ Development" : ""}`;
      button.addEventListener("click", () => applyCoopCompany(company));
      coopCompanyDuplicateMessage.append(button);
    });
  } catch (error) { if (sequence === companyDuplicateSequence) showToast(error.message || "ตรวจสอบชื่อบริษัทไม่สำเร็จ", "error"); }
});
let jobContextConfirmationOpen = false;
function handleJobRequestClick(event) {
  const button = event.target.closest("button[data-job-posting-id]");
  if (!button || button.disabled || jobContextConfirmationOpen) return;
  const token = getStudentToken();
  let preparedJob = null;
  jobContextConfirmationOpen = true;
  showConfirmModal({
    title: "ยืนยันการเขียนคำร้องสหกิจศึกษา",
    message: `กรุณาติดต่อสถานประกอบการเพื่อสอบถามการรับนักศึกษาสหกิจศึกษาก่อนเขียนคำร้อง\n\nสถานประกอบการ: ${button.dataset.companyName}\nตำแหน่ง: ${button.dataset.jobTitle}`,
    confirmLabel: "ยืนยันและดำเนินการต่อ", cancelLabel: "ยกเลิก", loadingLabel: "กำลังเตรียมแบบฟอร์ม...",
    returnFocus: () => preparedJob && coopRequestModal?.classList.contains("open") ? document.getElementById("coopCompanyName") : button,
    fallbackFocus: jobMatchingSkillsBtn,
    onConfirm: async () => {
      if (token !== getStudentToken() || !canUseCoopFeatures(currentStudent)) throw new Error("สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเปิดรายการใหม่");
      if ((!coopRequestsLoaded || coopRequestsLoadError) && !await loadCoopRequests()) throw new Error("โหลดคำร้องไม่สำเร็จ กรุณาลองใหม่");
      if (currentCoopRequest) throw new Error("มีคำร้องสหกิจศึกษาที่กำลังดำเนินการอยู่ กรุณาตรวจสอบในเมนูคำร้อง");
      const result = await getPublishedJobPostingForCoopRequest(button.dataset.jobPostingId);
      if (token !== getStudentToken()) throw new Error("สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเปิดรายการใหม่");
      if (!result?.data?.company) throw new Error("ไม่พบข้อมูลตำแหน่งงานที่พร้อมใช้ กรุณาค้นหาใหม่");
      preparedJob = result.data;
    },
    onClose: () => {
      jobContextConfirmationOpen = false;
      // Cancel leaves the draft and current screen untouched. Confirm only
      // prepares the original form; creation still occurs on its Submit event.
      if (!preparedJob || token !== getStudentToken()) return;
      if (button.isConnected) button.focus();
      if (!openCoopRequestModal()) return;
      selectedCoopJobPostingId = preparedJob.id;
      applyCoopCompany(preparedJob.company, { preserveJob: true });
      if (coopSelectedJobPosting) {
        coopSelectedJobPosting.textContent = `ตำแหน่งงาน: ${preparedJob.title}`;
        coopSelectedJobPosting.hidden = false;
      }
    },
  });
}
jobMatchingResults?.addEventListener("click", handleJobRequestClick);
jobBrowserResults?.addEventListener("click", handleJobRequestClick);
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
document.getElementById('coopRequestDetailRetry')?.addEventListener('click', () => openCoopRequestDetail(coopRequestDetailId));
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
// Daily Log Modal is replaced by the persistent inline daily editor.
// ==============================
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
const retryProjectBtn = document.getElementById("retryProjectBtn");
const retryProjectAdvisorBtn = document.getElementById("retryProjectAdvisorBtn");
const retryProjectFilesBtn = document.getElementById("retryProjectFilesBtn");
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
const projectPreviewTabs = new Set();
let projectSessionToken = null;
let projectSessionRevoked = false;
let projectSessionEpoch = 0;
let projectLoadSequence = 0;
let projectLoadPromise = null;
let advisorLoadPromise = null;
let projectFilesLoadPromise = null;
let savedProjectTopic = null;
let latestProjectTopic = null;
let projectNeedsReconcile = false;
let advisorMutationUncertain = false;
let projectFileWriteUncertain = false;
let advisorLoadState = "loading";
let hasAdvisorSnapshot = false;
const projectLinks = mountStudentProjectLinks({ document, getContext: projectContext, isLive: projectSessionLive, onSessionError: projectSessionError });

function startStudentProjectSession(token) {
  if (projectSessionRevoked || !token || token !== getStudentToken()) return false;
  if (projectSessionToken && projectSessionToken !== token) { revokeStudentProjectSession(); return false; }
  projectSessionToken = token;
  syncProjectControls();
  return true;
}

function projectSessionLive(context = { token: projectSessionToken, epoch: projectSessionEpoch }) {
  return !projectSessionRevoked && Boolean(context?.token) && context.token === projectSessionToken
    && context.epoch === projectSessionEpoch && context.token === getStudentToken();
}

function projectContext() {
  if (!projectSessionLive()) {
    if (projectSessionToken) revokeStudentProjectSession();
    return null;
  }
  return { token: projectSessionToken, epoch: projectSessionEpoch };
}

function acceptProjectResponse(context) {
  if (projectSessionLive(context)) return true;
  revokeStudentProjectSession();
  return false;
}

function clearProjectPreviews() {
  for (const [url, preview] of projectPreviewUrls) { clearInterval(preview.timer); URL.revokeObjectURL(url); }
  projectPreviewUrls.clear();
  for (const tab of projectPreviewTabs) { try { tab.close(); } catch { /* Already closed. */ } }
  projectPreviewTabs.clear();
}

function revokeStudentProjectSession() {
  projectSessionRevoked = true;
  projectSessionToken = null;
  ++projectSessionEpoch;
  ++projectLoadSequence;
  projectLoadPromise = advisorLoadPromise = projectFilesLoadPromise = null;
  isProjectSaving = isProjectUploading = isAdvisorRequestSaving = false;
  isProjectLoaded = isAdvisorLoaded = isAdvisorDirectoryLoaded = false;
  savedProjectTopic = latestProjectTopic = null;
  projectNeedsReconcile = advisorMutationUncertain = projectFileWriteUncertain = false;
  projectAdvisorTeachers = [];
  projectAdvisorRequest = { status: "unknown", teacher: null };
  confirmedProjectAdvisor = null;
  hasAdvisorSnapshot = false;
  advisorLoadState = "error";
  for (const input of [projectTitle, projectBookFile, posterFile]) if (input) input.value = "";
  for (const container of [projectBookCurrent, posterCurrent]) { container?.replaceChildren(); if (container) delete container.dataset.hasFile; }
  clearProjectPreviews();
  projectLinks.revoke();
  topicExams?.revoke();
  for (const control of document.querySelectorAll('#co09Student button, #co09Student input, #co09Student select, #co09Student textarea')) control.disabled = true;
  for (const node of [projectMessage, projectAdvisorMessage, projectUploadMessage]) showMessage(node, "สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่", "error");
  projectMessage?.setAttribute("aria-busy", "false");
  if (projectAdvisorHelp) projectAdvisorHelp.textContent = "กรุณาเข้าสู่ระบบใหม่เพื่อโหลดสถานะอาจารย์";
  for (const node of [saveProjectBtn, uploadProjectBtn]) setButtonLoading(node, false);
  document.getElementById('panel-coop')?.setAttribute('aria-busy', 'false');
  renderProjectAdvisor();
  syncProjectControls();
}

function hasUnsavedProjectTopic() {
  return !projectSessionRevoked && Boolean(projectTitle) && projectTitle.value !== (savedProjectTopic ?? "");
}
function hasUnsavedProjectWork() {
  return hasUnsavedProjectTopic() || projectLinks.hasChanges();
}

function syncProjectControls() {
  const live = projectSessionLive();
  if (projectTitle) projectTitle.disabled = !live || isProjectSaving;
  if (saveProjectBtn) saveProjectBtn.disabled = !live || !isProjectLoaded || isProjectSaving || Boolean(projectLoadPromise) || projectNeedsReconcile;
  if (uploadProjectBtn) uploadProjectBtn.disabled = !live || isProjectUploading || Boolean(projectFilesLoadPromise) || projectFileWriteUncertain;
  for (const input of [projectBookFile, posterFile]) if (input) input.disabled = !live || isProjectUploading;
  if (retryProjectBtn) retryProjectBtn.disabled = !live || isProjectSaving || Boolean(projectLoadPromise);
  if (retryProjectAdvisorBtn) retryProjectAdvisorBtn.disabled = !live || isAdvisorRequestSaving || Boolean(advisorLoadPromise);
  if (retryProjectFilesBtn) retryProjectFilesBtn.disabled = !live || isProjectUploading || Boolean(projectFilesLoadPromise);
}

function projectSessionError(error, context) {
  if (!acceptProjectResponse(context)) return true;
  if (error.status === 401 || ['ACCOUNT_UNAUTHORIZED', 'STUDENT_SESSION_CHANGED', 'CO09_SESSION_CHANGED'].includes(error.data?.code)) {
    revokeStudentProjectSession();
    return true;
  }
  return false;
}

function projectErrorMessage(error) {
  const codes = {
    TOPIC_CONFLICT: "หัวข้อโครงการเปลี่ยนแล้ว ร่างของคุณยังอยู่ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก",
    TOPIC_BASELINE_REQUIRED: "กรุณาโหลดหัวข้อโครงการก่อนบันทึก",
    PROJECT_COMMIT_UNCERTAIN: "ยังยืนยันผลบันทึกไม่ได้ ร่างยังอยู่ กรุณาโหลดหัวข้อล่าสุดก่อนลองใหม่",
    ADVISOR_TARGET_UNAVAILABLE: "อาจารย์ที่เลือกไม่พร้อมรับคำขอ กรุณาโหลดรายชื่อใหม่",
    ADVISOR_CONFIRMED: "ไม่สามารถเปลี่ยนอาจารย์ที่ยืนยันแล้วได้",
    ADVISOR_COMMIT_UNCERTAIN: "ยังยืนยันผลส่งคำขอไม่ได้ กรุณาโหลดสถานะล่าสุดก่อนลองใหม่",
    ADVISOR_SCHEMA_NOT_READY: "บริการคำขออาจารย์ยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ",
  };
  const statuses = { 400: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่", 401: "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่", 403: "ไม่สามารถดำเนินการนี้ได้ กรุณาโหลดข้อมูลล่าสุด", 404: "ไม่พบข้อมูลที่ต้องการ กรุณาโหลดข้อมูลล่าสุด", 409: "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด", 500: "ระบบไม่สามารถดำเนินการได้ กรุณาลองใหม่", 503: "บริการยังไม่พร้อม กรุณาลองใหม่ภายหลัง" };
  return codes[error.data?.code] || statuses[error.status] || "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป กรุณาลองใหม่";
}

function renderProjectAdvisor() {
  renderProfileAdvisors(document, currentStudent, { loaded: isAdvisorLoaded, request: projectAdvisorRequest, confirmed: confirmedProjectAdvisor });
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
    current.disabled = true; // Retain historical context without offering an unavailable target.
    projectAdvisor.appendChild(current);
  }
  projectAdvisor.value = advisor?.id || "";
  const confirmed = Boolean(confirmedProjectAdvisor) || projectAdvisorRequest.status === "confirmed";
  projectAdvisor.disabled = !projectSessionLive() || confirmed || !isAdvisorLoaded || !isAdvisorDirectoryLoaded || isAdvisorRequestSaving || advisorLoadState !== "loaded" || advisorMutationUncertain;
  if (projectAdvisorStatus) {
    const labels = { loading: "กำลังโหลดสถานะอาจารย์...", none: "ยังไม่ได้เลือกอาจารย์", pending: "รออาจารย์ยืนยัน", confirmed: "อาจารย์ยืนยันแล้ว", rejected: "อาจารย์ปฏิเสธคำขอ", error: "โหลดสถานะอาจารย์ไม่สำเร็จ", stale: "ข้อมูลอาจารย์ครั้งก่อน · ยังยืนยันสถานะล่าสุดไม่ได้", unknown: "ไม่รู้จักสถานะที่ได้รับ กรุณาลองโหลดใหม่" };
    const status = advisorLoadState === "loaded" ? (confirmed ? "confirmed" : projectAdvisorRequest.status) : advisorLoadState;
    const colors = { pending: "is-advisor_review", confirmed: "is-approved", rejected: "is-rejected" };
    const badge = document.createElement("span");
    badge.className = `coop-status-badge project-advisor-badge ${colors[status] || ""}`;
    badge.textContent = labels[status] || labels.unknown;
    projectAdvisorStatus.dataset.status = status;
    projectAdvisorStatus.setAttribute("aria-busy", String(status === "loading"));
    projectAdvisorStatus.setAttribute("aria-live", "polite");
    projectAdvisorStatus.replaceChildren(badge);
    if (advisor && (advisorLoadState === "loaded" || advisorLoadState === "stale")) {
      const selected = document.createElement("span");
      selected.className = "project-advisor-selected";
      selected.textContent = `${advisorLoadState === "stale" ? "ข้อมูลครั้งก่อน · " : ""}อาจารย์: ${advisor.name || formatTeacherName(advisor)}`;
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
  if (!projectContext()) return;
  await Promise.all([loadCoopProject(), loadCoopProjectFiles(), loadProjectAdvisorRequest(), projectLinks.load(), topicExams?.refresh()]);
}

function loadCoopProject({ replaceDraft = false } = {}) {
  if (projectLoadPromise) return projectLoadPromise;
  const context = projectContext();
  if (!context || isProjectSaving) return Promise.resolve(false);
  const sequence = ++projectLoadSequence;
  const titleBeforeRead = projectTitle?.value || "";
  const dirtyBeforeRead = hasUnsavedProjectTopic() || projectNeedsReconcile;
  if (retryProjectBtn) retryProjectBtn.hidden = true;
  showMessage(projectMessage, "กำลังโหลดหัวข้อโครงการ...", "loading");
  projectMessage?.setAttribute("aria-busy", "true");
  projectLoadPromise = (async () => {
    try {
      const project = await getMyCoopProject({ sessionToken: context.token });
      if (!acceptProjectResponse(context) || sequence !== projectLoadSequence) return false;
      if (typeof project?.topic !== "string") throw new Error("Invalid project response");
      latestProjectTopic = project.topic;
      const keepDraft = (!replaceDraft && dirtyBeforeRead) || projectTitle?.value !== titleBeforeRead;
      if (!keepDraft) {
        if (projectTitle) projectTitle.value = project.topic;
        savedProjectTopic = project.topic;
        projectNeedsReconcile = false;
        clearMessage(projectMessage);
      } else {
        // A refresh must not silently rebase an existing draft onto a newer
        // server value; the old baseline is still needed to detect a stale save.
        if (savedProjectTopic === null) savedProjectTopic = project.topic;
        if (project.topic !== savedProjectTopic) projectNeedsReconcile = true;
        showMessage(projectMessage, "โหลดข้อมูลล่าสุดแล้ว ร่างของคุณยังอยู่ หากต้องการแทนร่างให้เลือกโหลดหัวข้อล่าสุด", "info");
      }
      isProjectLoaded = true;
      return true;
    } catch (error) {
      if (projectSessionError(error, context) || sequence !== projectLoadSequence) return false;
      showMessage(projectMessage, `${projectErrorMessage(error)} ร่างหัวข้อยังคงอยู่`, "error");
      return false;
    } finally {
      if (projectSessionLive(context) && sequence === projectLoadSequence) {
        projectLoadPromise = null;
        projectMessage?.setAttribute("aria-busy", "false");
        if (retryProjectBtn) retryProjectBtn.hidden = false;
        syncProjectControls();
      }
    }
  })();
  syncProjectControls();
  return projectLoadPromise;
}

function reloadProjectTopic() {
  const context = projectContext();
  if (!context || isProjectSaving || projectLoadPromise) return;
  const reload = () => acceptProjectResponse(context) ? loadCoopProject({ replaceDraft: true }) : false;
  if (hasUnsavedProjectTopic() || projectNeedsReconcile) {
    showConfirmModal({ title: "โหลดหัวข้อล่าสุด?", message: "ร่างที่ยังไม่บันทึกจะถูกแทนที่ด้วยข้อมูลล่าสุด กรุณาเก็บข้อความที่ต้องการไว้ก่อน", confirmLabel: "แทนร่างและโหลดล่าสุด", onConfirm: reload });
  } else reload();
}

function applyProjectAdvisorSnapshot(result) {
  if (!["none", "pending", "confirmed", "rejected"].includes(result?.advisor_request?.status)) return false;
  projectAdvisorRequest = result.advisor_request;
  confirmedProjectAdvisor = result.confirmed_advisor || null;
  hasAdvisorSnapshot = true;
  isAdvisorLoaded = true;
  advisorLoadState = "loaded";
  advisorMutationUncertain = false;
  return true;
}

function loadProjectAdvisorRequest({ afterMutation = false } = {}) {
  if (advisorLoadPromise) return advisorLoadPromise;
  const context = projectContext();
  if (!context || (isAdvisorRequestSaving && !afterMutation)) return Promise.resolve(false);
  isAdvisorLoaded = false;
  isAdvisorDirectoryLoaded = false;
  advisorLoadState = "loading";
  if (retryProjectAdvisorBtn) retryProjectAdvisorBtn.hidden = true;
  renderProjectAdvisor();
  advisorLoadPromise = (async () => {
    try {
      const options = { sessionToken: context.token };
      const [request, directory] = await Promise.allSettled([getMyProjectAdvisorRequest(options), getProjectAdvisorTeachers(options)]);
      if (!acceptProjectResponse(context)) return false;
      for (const result of [request, directory]) if (result.status === "rejected" && projectSessionError(result.reason, context)) return false;
      const errors = [];
      if (request.status === "fulfilled") {
        if (!applyProjectAdvisorSnapshot(request.value)) { advisorLoadState = "unknown"; errors.push("ไม่รู้จักสถานะที่ได้รับ กรุณาลองโหลดใหม่"); }
      } else {
        advisorLoadState = hasAdvisorSnapshot ? "stale" : "error";
        errors.push(projectErrorMessage(request.reason));
      }
      if (directory.status === "fulfilled" && Array.isArray(directory.value?.teachers)) {
        projectAdvisorTeachers = directory.value.teachers;
        isAdvisorDirectoryLoaded = true;
      } else errors.push(directory.status === "rejected" ? projectErrorMessage(directory.reason) : "โหลดรายชื่ออาจารย์ไม่สำเร็จ");
      if (projectAdvisorHelp) projectAdvisorHelp.textContent = errors.length ? errors.join(" • ") : "เลือกอาจารย์เพื่อส่งคำขอยืนยัน หัวข้อโครงการบันทึกและแก้ไขได้ทันที";
      if (retryProjectAdvisorBtn) retryProjectAdvisorBtn.hidden = !errors.length;
      return isAdvisorLoaded && isAdvisorDirectoryLoaded;
    } finally {
      if (projectSessionLive(context)) {
        advisorLoadPromise = null;
        renderProjectAdvisor();
        syncProjectControls();
      }
    }
  })();
  syncProjectControls();
  return advisorLoadPromise;
}

async function requestProjectAdvisor() {
  const context = projectContext();
  if (!context || advisorLoadPromise || advisorMutationUncertain || isAdvisorRequestSaving || !isAdvisorLoaded || !isAdvisorDirectoryLoaded || confirmedProjectAdvisor || projectAdvisorRequest.status === "confirmed") return;
  const teacherId = projectAdvisor?.value;
  if (!teacherId) { renderProjectAdvisor(); return; }
  isAdvisorRequestSaving = true;
  projectAdvisor.disabled = true;
  clearMessage(projectAdvisorMessage);
  try {
    const saved = await requestMyProjectAdvisor(teacherId, { sessionToken: context.token });
    if (!acceptProjectResponse(context)) return;
    if (!applyProjectAdvisorSnapshot(saved)) throw Object.assign(new Error("Unknown advisor response"), { status: 503 });
    renderProjectAdvisor();
    showMessage(projectAdvisorMessage, "ส่งคำขออาจารย์ที่ปรึกษาแล้ว", "success");
    showToast("ส่งคำขออาจารย์ที่ปรึกษาแล้ว", "success");
    const refreshed = await loadProjectAdvisorRequest({ afterMutation: true });
    if (acceptProjectResponse(context) && !refreshed) showMessage(projectAdvisorMessage, "ส่งคำขอสำเร็จ แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณากดลองโหลดอีกครั้ง", "info");
  } catch (error) {
    if (projectSessionError(error, context)) return;
    advisorMutationUncertain = !error.status || error.status >= 500;
    showMessage(projectAdvisorMessage, advisorMutationUncertain ? "ยังยืนยันผลส่งคำขอไม่ได้ กำลังโหลดสถานะล่าสุด กรุณาตรวจสอบก่อนส่งอีกครั้ง" : projectErrorMessage(error), "error");
    // Read to reconcile; never retry the mutation automatically.
    await loadProjectAdvisorRequest({ afterMutation: true });
  } finally {
    if (projectSessionLive(context)) {
      isAdvisorRequestSaving = false;
      renderProjectAdvisor();
      syncProjectControls();
    }
  }
}
projectAdvisor?.addEventListener("change", requestProjectAdvisor);

async function saveCoopProjectTopic() {
  const context = projectContext();
  if (!context || isProjectSaving || projectLoadPromise || !isProjectLoaded || projectNeedsReconcile || savedProjectTopic === null) return;
  const topic = projectTitle?.value.trim() || "";
  if (!topic || [...topic].length > 500) {
    showMessage(projectMessage, "กรุณากรอกหัวข้อโครงการไม่เกิน 500 ตัวอักษร", "error");
    return;
  }
  isProjectSaving = true;
  if (projectTitle) projectTitle.disabled = true;
  setButtonLoading(saveProjectBtn, true, "กำลังบันทึก...");
  try {
    const saved = await saveMyCoopProject(topic, savedProjectTopic, { sessionToken: context.token });
    if (!acceptProjectResponse(context)) return;
    if (typeof saved?.topic !== "string") throw Object.assign(new Error("Unknown project response"), { status: 503 });
    if (projectTitle) projectTitle.value = saved.topic;
    savedProjectTopic = latestProjectTopic = saved.topic;
    projectNeedsReconcile = false;
    showMessage(projectMessage, "บันทึกหัวข้อโครงการสำเร็จ", "success");
    showToast("บันทึกหัวข้อโครงการสำเร็จ", "success");
  } catch (error) {
    if (projectSessionError(error, context)) return;
    projectNeedsReconcile = error.status === 409 || !error.status || error.status >= 500;
    showMessage(projectMessage, projectNeedsReconcile ? `${projectErrorMessage(error)} ร่างยังอยู่ กรุณาโหลดหัวข้อล่าสุดก่อนลองบันทึกอีกครั้ง` : projectErrorMessage(error), "error");
    if (retryProjectBtn) retryProjectBtn.hidden = false;
    if (error.status === 409) reloadProjectTopicAfterConflict(context);
  } finally {
    if (projectSessionLive(context)) {
      isProjectSaving = false;
      setButtonLoading(saveProjectBtn, false);
      syncProjectControls();
    }
  }
}
function reloadProjectTopicAfterConflict(context) {
  showConfirmModal({ title: "หัวข้อโครงการเปลี่ยนแล้ว", message: "ร่างของคุณยังคงอยู่ ต้องการแทนร่างด้วยหัวข้อล่าสุดหรือไม่? ยกเลิกเพื่อเก็บร่างไว้ก่อน", confirmLabel: "แทนร่างและโหลดล่าสุด", onConfirm: () => acceptProjectResponse(context) && loadCoopProject({ replaceDraft: true }) });
}
projectTitle?.addEventListener("input", () => { if (!projectNeedsReconcile) clearMessage(projectMessage); syncProjectControls(); });
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

function loadCoopProjectFiles({ afterMutation = false } = {}) {
  if (projectFilesLoadPromise) return projectFilesLoadPromise;
  const context = projectContext();
  if (!context || (isProjectUploading && !afterMutation)) return Promise.resolve(false);
  if (retryProjectFilesBtn) retryProjectFilesBtn.hidden = true;
  projectFilesLoadPromise = (async () => {
    try {
      const result = await getMyCoopProjectFiles({ sessionToken: context.token });
      if (!acceptProjectResponse(context)) return false;
      if (!Array.isArray(result?.files)) throw new Error("Invalid project file response");
      renderCurrentProjectFile(projectBookCurrent, result.files.find(file => file.file_type === "coop_project_book"));
      renderCurrentProjectFile(posterCurrent, result.files.find(file => file.file_type === "coop_poster"));
      projectFileWriteUncertain = false;
      clearMessage(projectUploadMessage);
      return true;
    } catch (error) {
      if (projectSessionError(error, context)) return false;
      showMessage(projectUploadMessage, `${projectErrorMessage(error)} กรุณาลองโหลดรายการไฟล์อีกครั้ง`, "error");
      for (const container of [projectBookCurrent, posterCurrent]) {
        if (container && container.dataset.hasFile !== "true") container.textContent = "โหลดรายการไฟล์ไม่สำเร็จ";
      }
      if (retryProjectFilesBtn) retryProjectFilesBtn.hidden = false;
      return false;
    } finally {
      if (projectSessionLive(context)) { projectFilesLoadPromise = null; syncProjectControls(); }
    }
  })();
  syncProjectControls();
  return projectFilesLoadPromise;
}

retryProjectBtn?.addEventListener("click", reloadProjectTopic);
retryProjectAdvisorBtn?.addEventListener("click", () => loadProjectAdvisorRequest());
retryProjectFilesBtn?.addEventListener("click", () => loadCoopProjectFiles());

function validateProjectUpload(file, category) {
  const types = category === "project-book" ? { "application/pdf": ["pdf"] } : { "application/pdf": ["pdf"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"] };
  const extension = file.name.split(".").pop().toLowerCase();
  if (!types[file.type]?.includes(extension) || file.size < 1 || file.size > 10 * 1024 * 1024 || /[\\/\u0000-\u001f]/.test(file.name) || file.name.includes("..")) {
    throw new Error(category === "project-book" ? "เล่มโครงการต้องเป็น PDF ขนาดไม่เกิน 10MB" : "โปสเตอร์ต้องเป็น PDF, PNG หรือ JPEG ขนาดไม่เกิน 10MB");
  }
}

async function uploadCoopProjectFiles() {
  const context = projectContext();
  if (!context || isProjectUploading || projectFileWriteUncertain || projectFilesLoadPromise) return;
  const selected = [["project-book", projectBookFile], ["poster", posterFile]].filter(([, input]) => input?.files?.[0]);
  try {
    if (!selected.length) throw new Error("กรุณาเลือกไฟล์ที่ต้องการอัปโหลด");
    for (const [category, input] of selected) validateProjectUpload(input.files[0], category);
  } catch (error) { showMessage(projectUploadMessage, error.message, "error"); return; }
  isProjectUploading = true;
  setButtonLoading(uploadProjectBtn, true, "กำลังอัปโหลด...");
  for (const [, input] of selected) input.disabled = true;
  clearMessage(projectUploadMessage);
  let acknowledged = 0;
  try {
    // Independent categories: a successful Book is retained if Poster fails.
    for (const [category, input] of selected) {
      if (!acceptProjectResponse(context)) return;
      await uploadMyCoopProjectFile(category, input.files[0], { sessionToken: context.token });
      if (!acceptProjectResponse(context)) return;
      acknowledged++;
      input.value = "";
    }
    showMessage(projectUploadMessage, "อัปโหลดไฟล์โครงการสำเร็จ", "success");
    showToast("อัปโหลดไฟล์โครงการสำเร็จ", "success");
    const loaded = await loadCoopProjectFiles({ afterMutation: true });
    if (acceptProjectResponse(context)) showMessage(projectUploadMessage, loaded ? "อัปโหลดไฟล์โครงการสำเร็จ" : "อัปโหลดสำเร็จ แต่โหลดรายการล่าสุดไม่สำเร็จ กรุณาลองโหลดอีกครั้ง", loaded ? "success" : "info");
  } catch (error) {
    if (projectSessionError(error, context)) return;
    projectFileWriteUncertain = !error.status || error.status >= 500;
    await loadCoopProjectFiles({ afterMutation: true });
    if (acceptProjectResponse(context)) showMessage(projectUploadMessage, `${acknowledged ? "อัปโหลดสำเร็จบางไฟล์แล้ว · " : ""}${projectErrorMessage(error)}${!error.status || error.status >= 500 ? " ยังยืนยันผลไฟล์ที่เกิดปัญหาไม่ได้ โปรดตรวจรายการล่าสุดก่อนอัปโหลดซ้ำ" : ""}`, "error");
  } finally {
    if (projectSessionLive(context)) {
      isProjectUploading = false;
      setButtonLoading(uploadProjectBtn, false);
      syncProjectControls();
    }
  }
}
uploadProjectBtn?.addEventListener("click", uploadCoopProjectFiles);

async function openProjectFilePreview(file, button) {
  const context = projectContext();
  if (!context || button.disabled) return;
  // Reserve the tab inside the click gesture before awaiting authenticated Blob fetch.
  const tab = window.open("", "_blank");
  if (!tab) { showMessage(projectUploadMessage, "กรุณาอนุญาตเปิดแท็บใหม่เพื่อดูไฟล์", "error"); return; }
  projectPreviewTabs.add(tab);
  tab.opener = null;
  setButtonLoading(button, true, "กำลังเปิด...");
  let objectUrl;
  try {
    const blob = await previewMyCoopProjectFile(file.id, { sessionToken: context.token });
    if (!acceptProjectResponse(context)) { tab.close(); return; }
    if (!["application/pdf", "image/png", "image/jpeg"].includes(blob.type)) throw new Error("ประเภทไฟล์ไม่รองรับการเปิดดู");
    if (tab.closed) { projectPreviewTabs.delete(tab); return; }
    objectUrl = URL.createObjectURL(blob);
    tab.location.replace(objectUrl);
    const timer = setInterval(() => {
      if (tab.closed) { URL.revokeObjectURL(objectUrl); clearInterval(timer); projectPreviewUrls.delete(objectUrl); projectPreviewTabs.delete(tab); }
    }, 1000);
    projectPreviewUrls.set(objectUrl, { timer, tab });
  } catch (error) {
    tab.close();
    projectPreviewTabs.delete(tab);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (!projectSessionError(error, context)) showMessage(projectUploadMessage, projectErrorMessage(error), "error");
  } finally { if (projectSessionLive(context)) setButtonLoading(button, false); }
}
window.addEventListener("pagehide", clearProjectPreviews);

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
let mentorLoadController = null;
let mentorLoadError = false;
const mentorStatusSync = createMentorStatusSync({
  refresh: () => loadMentor({ quiet: true }),
  isPending: () => currentMentor?.status === "pending",
  isBusy: () => mentorLoading || mentorSubmitting || mentorDeleting || mentorResending || mentorModal?.classList.contains("open"),
  window, document,
});

function renderMentor() {
  const hasMentor = Boolean(currentMentor);
  document.getElementById("mentorDetails").hidden = !hasMentor;
  document.getElementById("mentorEmpty").hidden = hasMentor || mentorLoading || mentorLoadError;
  document.getElementById("mentorRetry").hidden = !mentorLoadError;
  document.getElementById("mentorRetry").disabled = mentorLoading;
  document.getElementById("mentorSyncNote").hidden = !hasMentor || currentMentor.status !== "pending";
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
      ? "รอพี่เลี้ยงยืนยันผ่านอีเมล ระบบจะตรวจสอบสถานะให้อัตโนมัติ"
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
    btnAddMentor.hidden = hasMentor;
    btnAddMentor.disabled = isBusy || Boolean(currentMentor);
  }

  if (btnEditMentor) {
    btnEditMentor.hidden = !hasMentor;
    btnEditMentor.disabled = isBusy || !currentMentor;
  }

  if (btnDeleteMentor) {
    btnDeleteMentor.hidden = !hasMentor;
    btnDeleteMentor.disabled = isBusy || !currentMentor;
  }
  mentorStatusSync.update();
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

async function loadMentor({ quiet = false } = {}) {
  if (mentorLoading || mentorSubmitting || mentorDeleting || mentorResending) {
    return false;
  }

  mentorLoading = true;
  const controller = new AbortController();
  mentorLoadController = controller;
  renderMentor();
  if (!quiet) showMessage(mentorMessage, "กำลังโหลดข้อมูลพี่เลี้ยง...", "loading");

  try {
    const result = await getMyMentor({ signal: controller.signal });
    if (controller.signal.aborted) return false;
    currentMentor = result?.data || null;
    mentorLoadError = false;
    renderMentor();

    if (currentMentor) {
      clearMessage(mentorMessage);
    } else {
      showMessage(mentorMessage, "ยังไม่มีข้อมูลพี่เลี้ยง กรุณาเพิ่มข้อมูลเพื่อดำเนินการต่อ", "info");
    }

    return true;
  } catch (error) {
    if (controller.signal.aborted) return false;
    mentorLoadError = true;
    renderMentor();
    showMessage(mentorMessage, getMentorErrorMessage(error, "โหลด"), "error");
    return false;
  } finally {
    mentorLoadController = null;
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
  if (mentorLoading || mentorSubmitting || mentorDeleting || mentorResending || (mode === "edit" && !currentMentor)) {
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
  if (mentorLoading || mentorSubmitting || mentorDeleting || mentorResending) {
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
  if (mentorLoading || mentorSubmitting || mentorDeleting || mentorResending) {
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
    const saved = mentorFormMode === "edit" ? await updateMyMentor(data) : await createMentor(data);
    currentMentor = saved.data.mentor;
    mentorLoadError = false;

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
    showMessage(mentorMessage, getMentorErrorMessage(error, mentorFormMode === "edit" ? "แก้ไข" : "บันทึก"), "error");
  } finally {
    mentorSubmitting = false;
    setMentorFormSubmitting(false);
    renderMentor();
  }
}

async function deleteMentorAfterConfirmation() {
  if (!currentMentor || mentorLoading || mentorDeleting || mentorSubmitting || mentorResending) {
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
  if (!currentMentor || mentorLoading || mentorDeleting || mentorSubmitting || mentorResending) {
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
    mentorLoading ||
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
    currentMentor = result.data.mentor;

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
    mentorLoading ||
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
document.getElementById("mentorRetry").addEventListener("click", () => loadMentor());
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

  if (profilePanel?.contains(element) || profileEditModal?.contains(element)) { profileMessage(element, message, type); return; }
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

  if (profilePanel?.contains(element) || profileEditModal?.contains(element)) { profileMessage(element, ""); return; }
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
    subscribeStudentSession(handleStudentSessionChange);
    checkAuthentication();

    const activityPanel = document.getElementById("panel-activities");
    if (activityPanel && !activityPanel.hidden) {
      mountCoopActivities({ document, container: document.getElementById("activityCalendar"), storage: { getItem: key => key === "token" ? getStudentToken() : null } });
    }
  }
);

// Browser history may restore the existing document without DOMContentLoaded.
window.addEventListener("pageshow", event => { if (event.persisted) checkAuthentication(); });
