import { hashPassword } from '../../src/services/password.service.js';

/** Contraseña y hash de ejemplo para las pruebas (parámetros bajos: el hash real sería lento). */
export const TEST_PASSWORD = 'password-de-prueba';
export const LOW_COST_PARAMS = { N: 1024, r: 8, p: 1 } as const;
export const TEST_PASSWORD_HASH = await hashPassword(TEST_PASSWORD, LOW_COST_PARAMS);

/** Fila completa de `users`. Los parámetros aceptan `unknown` para poder armar filas inválidas. */
export function userRow(
  rut: unknown,
  role: unknown,
  active: unknown,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    rut,
    role,
    active,
    password_hash: TEST_PASSWORD_HASH,
    failed_attempts: 0,
    ...overrides,
  };
}
