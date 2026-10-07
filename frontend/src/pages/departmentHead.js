import { mountTeacherCoopRequests } from "./teacherCoopRequests.js";
import { getCurrentDepartmentHead, getHeadCoopRequests, getHeadCoopRequest, decideHeadCoopRequest } from "../api/departmentHead.api.js";
import { TEACHER_TOKEN_KEY } from "../api/teacherProjectAdvisor.api.js";

export function mountDepartmentHead(dependencies) {
  const { document, storage, location } = dependencies;
  document.getElementById("headLogout").addEventListener("click", () => { storage.removeItem(TEACHER_TOKEN_KEY); location.replace("/department-head-login.html"); });
  return mountTeacherCoopRequests({ me: getCurrentDepartmentHead, list: getHeadCoopRequests, detail: getHeadCoopRequest, decide: decideHeadCoopRequest, ...dependencies, role: "department_head" });
}
if (typeof document !== "undefined") mountDepartmentHead({ document, storage: sessionStorage, location: window.location });
