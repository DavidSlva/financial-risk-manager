import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Aún no hay código en src/ que probar; TDD: primero la prueba, después el código.
    passWithNoTests: true,
  },
});
