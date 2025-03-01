import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Asegura que use el index.html en la raíz
  base: '/', // Usa rutas relativas para evitar problemas de carga
  server: {
    port: 3000, // Asegura que corre en el puerto correcto
    open: true // Abre el navegador automáticamente
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
});
