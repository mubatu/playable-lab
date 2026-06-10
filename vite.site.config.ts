import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'site',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../dist-site',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 4173
  }
});
