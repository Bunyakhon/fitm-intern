import { saveStudentSession, clearStudentSession } from "./studentAuthStorage.js";
import { saveRoleSession, clearRoleSession } from "./roleAuthStorage.js";

export const destinations = {
  student: "/src/student_coop/student_coop.html", teacher: "/src/teacher_coop/teacher_coop.html",
  department_head: "/src/department_head/department_head.html", department_staff: "/src/department_staff/department_staff.html",
};
export function acceptLoginSession(result, { remember = false, saveStudent = saveStudentSession,
  saveRole = saveRoleSession, clearStudent = clearStudentSession, clearRole = clearRoleSession } = {}) {
  if (!Object.hasOwn(destinations, result?.role) || result.redirect !== destinations[result.role]
    || typeof result.token !== "string" || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(result.token)) throw new Error("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
  let header, claims;
  try {
    [header, claims] = result.token.split(".").slice(0, 2).map(part => JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))));
  } catch { throw new Error("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง"); }
  const type = result.role === "student" ? "student" : result.role === "department_staff" ? "department_staff" : "teacher";
  if (header.alg !== "HS256" || claims.actor_type !== type || claims.role !== result.role
    || (result.actor_type !== undefined && result.actor_type !== type)
    || typeof claims.id !== "string" || !claims.id || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new Error("ข้อมูลเข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง");
  const profile = type === "student" ? result.data : type === "teacher" ? result.teacher : result.staff;
  if (profile?.id !== claims.id || (type === "student" && (typeof claims.student_id !== "string" || !claims.student_id || profile.student_id !== claims.student_id))
    || (type === "teacher" && (claims.teacher_id !== claims.id || profile.status !== "active"
      || (profile.is_department_head === true) !== (result.role === "department_head") || (result.role === "department_head" && !profile.department?.trim())))
    || (type === "department_staff" && (claims.staff_id !== claims.id || profile.is_active !== true))) throw new Error("บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน");
  // Revoke other actor sessions through the same generation event. Draft keys
  // are untouched. Only the selected, server-authorized actor gets a token.
  clearStudent(); clearRole("teacher"); clearRole("department_staff");
  if (type === "student") saveStudent({ token: result.token, student: profile, remember });
  else saveRole(type, { token: result.token, profile, remember });
  return destinations[result.role];
}
