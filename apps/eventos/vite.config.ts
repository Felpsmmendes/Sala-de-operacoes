import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // jsPDF importa esses pacotes só pro método `.html()` (renderizar um
    // nó do DOM), que a gente não usa (só texto/tabela) — sem isso o
    // bundler falha tentando resolver dependências opcionais não
    // instaladas.
    rolldownOptions: {
      external: ['canvg', 'core-js', 'dompurify', 'html2canvas'],
    },
  },
});
