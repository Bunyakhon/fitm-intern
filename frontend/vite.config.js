import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      // multi-page app: ทุกหน้า HTML เป็น entry point แยกกัน
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        login: resolve(import.meta.dirname, 'login.html'),
        register: resolve(import.meta.dirname, 'register.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true, // ให้เข้าถึงได้จากนอก container ตอน dev
  },
});
