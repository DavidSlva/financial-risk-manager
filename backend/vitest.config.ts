import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Algunas pruebas lanzan procesos y calculan hashes scrypt de costo real: con la CPU compartida
    // entre archivos en paralelo, 5 s (el valor por defecto) es justo.
    testTimeout: 30_000,
    env: {
      // Clave solo para pruebas (64 bytes en hexadecimal). `environment` se evalúa al importar.
      JWT_SECRET: 'ab'.repeat(64),
    },
  },
});
