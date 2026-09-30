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
        register: fileURLToPath(new URL('./register.html', import.meta.url)),
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
