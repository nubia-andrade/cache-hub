import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Os testes cobrem só `src/lib/dominio` — as regras de negócio puras.
 *
 * É de propósito. Essas funções decidem valor de cachê, bloqueio de talento e
 * quem enxerga o quê; elas não dependem de banco, de tela nem de rede, então
 * dá para testá-las de verdade, rápido e sem montar nada. Testar componente e
 * consulta ao Supabase é outro assunto, com outro custo.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/dominio/**/*.test.ts'],
  },
});
