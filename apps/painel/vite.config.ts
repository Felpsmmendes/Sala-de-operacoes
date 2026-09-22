import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Projeto Vite independente do app principal (../) de propósito — ver
// README.md deste diretório. Mesmo Supabase por baixo (outro .env.local),
// zero import cruzado com ../src.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
