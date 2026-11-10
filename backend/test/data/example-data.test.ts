import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateIntegrity } from '../../src/services/data-integrity.service.js';
import { verifyPassword } from '../../src/services/password.service.js';

const dataFile = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../data/${name}`, import.meta.url)), 'utf8'));

describe('backend/data: datos versionados', () => {
  const data = {
    roles: dataFile('roles.json'),
    users: dataFile('users.example.json'),
    scores: dataFile('scores.example.json'),
    permissions: dataFile('permissions.json'),
  };

  it('los datos de ejemplo cumplen todas las reglas de integridad', () => {
    expect(validateIntegrity(data)).toEqual([]);
  });

  it('los usuarios de ejemplo parten con el contador de intentos en 0', () => {
    for (const user of data.users as { failed_attempts: number }[]) {
      expect(user.failed_attempts).toBe(0);
    }
  });

  it('la contraseña de ejemplo documentada (ejemplo-1234) coincide con el hash', async () => {
    for (const user of data.users as { password_hash: string }[]) {
      await expect(verifyPassword('ejemplo-1234', user.password_hash)).resolves.toBe(true);
    }
  });

  it('el hash de ejemplo usa los parámetros por defecto', () => {
    for (const user of data.users as { password_hash: string }[]) {
      expect(user.password_hash.startsWith('scrypt$32768$8$3$')).toBe(true);
    }
  });
});
