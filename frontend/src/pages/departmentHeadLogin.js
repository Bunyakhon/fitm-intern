import { mountTeacherLogin } from "./teacherLogin.js";
import { loginDepartmentHead } from "../api/departmentHead.api.js";

export function mountDepartmentHeadLogin(dependencies) {
  const login = dependencies.login || loginDepartmentHead;
  return mountTeacherLogin({ ...dependencies, destination: "/src/department_head/department_head.html", forbiddenMessage: "บัญชีนี้ไม่มีสิทธิ์หัวหน้าภาควิชา กรุณาใช้บัญชีที่ได้รับสิทธิ์",
    login: async body => {
      const result = await login(body);
      if (result.teacher?.is_department_head !== true) throw Object.assign(Error("Head authorization required"), { status: 403 });
      return result;
    },
  });
}
if (typeof document !== "undefined") mountDepartmentHeadLogin({ document, storage: sessionStorage, location: window.location });
