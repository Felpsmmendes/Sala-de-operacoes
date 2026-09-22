import { defineConfig } from 'vitest/config';

// Config separado do vite.config.ts de propósito: os testes de hoje são
// só função pura (sem componente/DOM), não precisam do plugin do
// Tailwind nem do React — mantém a suíte rápida. `mode: 'test'` faz o
// Vite carregar `.env.test` (valores fictícios, ver o arquivo) em vez de
// exigir um `.env.local` de verdade só pra rodar `npm test`.
export default defineConfig({
  mode: 'test',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
