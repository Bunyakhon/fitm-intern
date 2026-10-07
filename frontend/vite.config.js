import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [tailwindcss()],

  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./login.html', import.meta.url)),
        teacherLogin: fileURLToPath(new URL('./teacher-login.html', import.meta.url)),
        teacherCoop: fileURLToPath(new URL('./src/teacher_coop/teacher_coop.html', import.meta.url)),
        departmentHeadLogin: fileURLToPath(new URL('./department-head-login.html', import.meta.url)),
        departmentHead: fileURLToPath(new URL('./src/department_head/department_head.html', import.meta.url)),
        staffLogin: fileURLToPath(new URL('./staff-login.html', import.meta.url)),
        departmentStaff: fileURLToPath(new URL('./src/department_staff/department_staff.html', import.meta.url)),
        register: fileURLToPath(new URL('./register.html', import.meta.url)),
        studentCoop: fileURLToPath(new URL('./src/student_coop/student_coop.html', import.meta.url)),
        mentorVerifyUser: fileURLToPath(new URL('./src/mentor_coop/mentor_verify_user.html', import.meta.url)),
        recruitStudent: fileURLToPath(new URL('./src/recruit_student/recruit_student.html', import.meta.url)),
        recruitVerifyEmail: fileURLToPath(new URL('./src/recruit_student/recruit_verify_email.html', import.meta.url)),
      },
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,

    watch: {
      usePolling: true,
      interval: 100,
    },
  },
});
