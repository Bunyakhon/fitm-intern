const destinations = {
  student: "/src/student_coop/student_coop.html", teacher: "/src/teacher_coop/teacher_coop.html",
  department_head: "/src/department_head/department_head.html", department_staff: "/src/department_staff/department_staff.html",
};
export function acceptGoogleSession(result, selectedRole, { saveStudentSession, storage, remember, location }) {
  const authorized = selectedRole === "teacher" ? ["teacher", "department_head"] : [selectedRole];
  if (!authorized.includes(result?.role) || result.redirect !== destinations[result.role] || typeof result.token !== "string") throw new Error("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
  // Only Application JWTs enter existing storage. Browser shape checks do not
  // replace server verification; protected APIs still authorize the live actor.
  let claims, header;
  try {
    [header, claims] = result.token.split(".").slice(0, 2).map(part => JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))));
  } catch { throw new Error("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง"); }
  const actor = result.role === "student" ? "student" : result.role === "department_staff" ? "department_staff" : "teacher";
  if (header.alg !== "HS256" || claims.actor_type !== actor || claims.role !== result.role || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new Error("ข้อมูลเข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง");
  if (actor === "student") saveStudentSession({ token: result.token, student: result.data, remember: !!remember });
  else {
    const profile = actor === "teacher" ? result.teacher : result.staff;
    if (!profile || profile.id !== claims.id || (actor === "teacher" && (claims.teacher_id !== claims.id || profile.status !== "active"
      || (result.role === "department_head" && profile.is_department_head !== true)))
      || (actor === "department_staff" && (claims.staff_id !== claims.id || profile.is_active !== true))) throw new Error("บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน");
    storage.setItem(actor === "teacher" ? "teacherToken" : "staffToken", result.token);
  }
  location.replace(destinations[result.role]);
}
