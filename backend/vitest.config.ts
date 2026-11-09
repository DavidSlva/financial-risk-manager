import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    env: {
      // Clave solo para pruebas (64 bytes en hexadecimal). `environment` se evalúa al importar.
      JWT_SECRET: 'ab'.repeat(64),
    },
  },
});
