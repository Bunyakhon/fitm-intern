import { acceptLoginSession, destinations } from "./loginSession.js";
export function acceptGoogleSession(result, selectedRole, { saveStudentSession, remember, location }) {
  const authorized = selectedRole === "auto" ? ['student', 'teacher', 'department_head', 'department_staff'] : selectedRole === "teacher" ? ["teacher", "department_head"] : [selectedRole];
  if (result?.role === 'super_admin') throw new Error('Google ไม่รองรับ Application Super Admin');
  if (!authorized.includes(result?.role)) throw new Error("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
  const destination = acceptLoginSession(result, { remember: !!remember, saveStudent: saveStudentSession });
  location.replace(destination);
}
