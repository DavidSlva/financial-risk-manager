import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';
import { TEST_PASSWORD, userRow } from '../helpers/user-fixtures.js';

// Se envuelve `verifyPassword` para contar cuántas veces se calcula un hash: cada intento de
// login debe costar una verificación, exista o no el usuario (igualar el tiempo de respuesta).
const verifySpy = vi.fn();

vi.mock('../../src/services/password.service.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/password.service.js')>();
  return {
    ...original,
    verifyPassword: (...args: Parameters<typeof original.verifyPassword>) => {
      verifySpy(...args);
      return original.verifyPassword(...args);
    },
  };
});

const { createDataStore } = await import('../../src/services/data-store.service.js');
const { login } = await import('../../src/services/auth.service.js');

const ACTIVE = '11111111-1';
const INACTIVE = '22222222-2';

describe('auth.service › login: verificación señuelo (tiempo parejo)', () => {
  let dir: string;
  let deps: Parameters<typeof login>[2];

  beforeEach(() => {
    verifySpy.mockClear();
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
    deps = { store: createDataStore(dir), jwt: testJwtConfig(), loginMaxAttempts: 2 };
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const attempt = (rut: string, password = TEST_PASSWORD) =>
    login(rut, password, deps).then(
      () => 'ok',
      () => 'rechazado',
    );

  it('contraseña incorrecta: una verificación', async () => {
    await attempt(ACTIVE, 'otra-clave-1234');

    expect(verifySpy).toHaveBeenCalledTimes(1);
  });

  it('rut inexistente: una verificación contra un hash señuelo', async () => {
    await attempt('99999999-9');

    expect(verifySpy).toHaveBeenCalledTimes(1);
    expect(verifySpy.mock.calls[0]?.[1]).toMatch(/^scrypt\$/);
  });

  it('usuario no vigente: una verificación contra un hash señuelo', async () => {
    await attempt(INACTIVE);

    expect(verifySpy).toHaveBeenCalledTimes(1);
  });

  it('usuario bloqueado: una verificación contra un hash señuelo (y no se acepta)', async () => {
    writeDataFile(
      dir,
      'users',
      [userRow(ACTIVE, 'admin', true, { failed_attempts: 2 }), userRow(INACTIVE, 'user', false)],
      2000,
    );

    await expect(attempt(ACTIVE)).resolves.toBe('rechazado');

    expect(verifySpy).toHaveBeenCalledTimes(1);
  });

  it('el hash señuelo no es el hash de ningún usuario real', async () => {
    await attempt('99999999-9');
    const decoy = verifySpy.mock.calls[0]?.[1] as string;

    const real = deps!.store!.load().users.map((u) => u.password_hash);
    expect(real).not.toContain(decoy);
  });

  it('login exitoso: una verificación', async () => {
    await expect(attempt(ACTIVE)).resolves.toBe('ok');

    expect(verifySpy).toHaveBeenCalledTimes(1);
  });
});
