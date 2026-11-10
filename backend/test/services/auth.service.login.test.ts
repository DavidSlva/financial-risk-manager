import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DataIntegrityError, createDataStore } from '../../src/services/data-store.service.js';
import { login, type AuthDeps } from '../../src/services/auth.service.js';
import { verifyToken } from '../../src/services/token.service.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';
import { TEST_PASSWORD, userRow } from '../helpers/user-fixtures.js';

const ACTIVE = '11111111-1';
const INACTIVE = '22222222-2';
const UNKNOWN = '99999999-9';
const MAX = 3;

describe('auth.service › login', () => {
  let dir: string;
  let deps: AuthDeps;

  beforeEach(() => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
    deps = { store: createDataStore(dir), jwt: testJwtConfig(), loginMaxAttempts: MAX };
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const attempts = (rut = ACTIVE) =>
    (
      JSON.parse(readFileSync(join(dir, 'users.json'), 'utf8')) as {
        rut: string;
        failed_attempts: number;
      }[]
    ).find((u) => u.rut === rut)?.failed_attempts;

  const setAttempts = (value: number, mtime = 2000) =>
    writeDataFile(
      dir,
      'users',
      [
        userRow(ACTIVE, 'admin', true, { failed_attempts: value }),
        userRow(INACTIVE, 'user', false),
      ],
      mtime,
    );

  const rejection = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (e: unknown) => e,
    );

  describe('éxito', () => {
    it('devuelve el par de tokens con sus vigencias', async () => {
      const pair = await login(ACTIVE, TEST_PASSWORD, deps);

      expect(pair.accessExpiresIn).toBe(900);
      expect(pair.refreshExpiresIn).toBe(604800);
      await expect(verifyToken(pair.accessToken, 'access', deps.jwt!)).resolves.toMatchObject({
        sub: ACTIVE,
      });
      await expect(verifyToken(pair.refreshToken, 'refresh', deps.jwt!)).resolves.toMatchObject({
        sub: ACTIVE,
      });
    });

    it('un login exitoso reinicia el contador de intentos', async () => {
      setAttempts(2);

      await login(ACTIVE, TEST_PASSWORD, deps);

      expect(attempts()).toBe(0);
    });

    it('un login exitoso sin intentos previos deja el contador en 0', async () => {
      await login(ACTIVE, TEST_PASSWORD, deps);

      expect(attempts()).toBe(0);
    });
  });

  describe('rechazos (401 indistinguibles)', () => {
    it('contraseña incorrecta: UNAUTHORIZED y cuenta el intento', async () => {
      await expect(login(ACTIVE, 'otra-clave-1234', deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });

      expect(attempts()).toBe(1);
    });

    it('rut inexistente: UNAUTHORIZED sin escribir nada', async () => {
      const before = readFileSync(join(dir, 'users.json'), 'utf8');

      await expect(login(UNKNOWN, TEST_PASSWORD, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });

      expect(readFileSync(join(dir, 'users.json'), 'utf8')).toBe(before);
    });

    it('usuario no vigente: UNAUTHORIZED aunque la contraseña sea correcta, sin escribir', async () => {
      const before = readFileSync(join(dir, 'users.json'), 'utf8');

      await expect(login(INACTIVE, TEST_PASSWORD, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });

      expect(readFileSync(join(dir, 'users.json'), 'utf8')).toBe(before);
    });

    it('el mensaje es el mismo en todos los casos (no revela la causa)', async () => {
      setAttempts(MAX);
      const errors = await Promise.all([
        rejection(login(ACTIVE, 'otra-clave-1234', deps)), // bloqueado
        rejection(login(UNKNOWN, TEST_PASSWORD, deps)), // inexistente
        rejection(login(INACTIVE, TEST_PASSWORD, deps)), // no vigente
      ]);
      setAttempts(0, 3000);
      errors.push(await rejection(login(ACTIVE, 'otra-clave-1234', deps))); // contraseña incorrecta

      expect(new Set(errors.map((e) => (e as Error).message)).size).toBe(1);
      expect(errors.every((e) => (e as { type?: string }).type === 'UNAUTHORIZED')).toBe(true);
    });

    it('el error no contiene la contraseña', async () => {
      const error = (await rejection(login(ACTIVE, 'clave-secreta-123', deps))) as Error;

      expect(error.message).not.toContain('clave-secreta-123');
    });
  });

  describe('límite de intentos', () => {
    it('cada intento fallido incrementa el contador', async () => {
      await rejection(login(ACTIVE, 'otra-clave-1234', deps));
      await rejection(login(ACTIVE, 'otra-clave-1234', deps));

      expect(attempts()).toBe(2);
    });

    it('al alcanzar el máximo el usuario queda bloqueado, aunque la contraseña sea correcta', async () => {
      for (let i = 0; i < MAX; i += 1) await rejection(login(ACTIVE, 'otra-clave-1234', deps));
      expect(attempts()).toBe(MAX);

      await expect(login(ACTIVE, TEST_PASSWORD, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });

      expect(attempts()).toBe(MAX);
    });

    it('un usuario bloqueado no puede obtener tokens (no hay forma de saltarse el bloqueo)', async () => {
      setAttempts(MAX);

      const result = await rejection(login(ACTIVE, TEST_PASSWORD, deps));

      expect(result).toBeInstanceOf(Error);
    });

    it('con intentos por debajo del máximo, la contraseña correcta funciona y reinicia', async () => {
      setAttempts(MAX - 1);

      await expect(login(ACTIVE, TEST_PASSWORD, deps)).resolves.toBeDefined();

      expect(attempts()).toBe(0);
    });

    it('el desbloqueo manual (contador en 0) permite volver a entrar', async () => {
      setAttempts(MAX);
      await expect(login(ACTIVE, TEST_PASSWORD, deps)).rejects.toBeDefined();

      setAttempts(0, 3000);

      await expect(login(ACTIVE, TEST_PASSWORD, deps)).resolves.toBeDefined();
    });

    it('el máximo sale de la configuración recibida', async () => {
      const strict = { ...deps, loginMaxAttempts: 1 };
      await rejection(login(ACTIVE, 'otra-clave-1234', strict));

      await expect(login(ACTIVE, TEST_PASSWORD, strict)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('usa por defecto el máximo de la configuración de la aplicación (5)', async () => {
      const rest: AuthDeps = { store: deps.store, jwt: deps.jwt };
      setAttempts(4);

      await expect(login(ACTIVE, TEST_PASSWORD, rest)).resolves.toBeDefined();
    });

    it('con peticiones concurrentes fallidas el contador no supera el máximo', async () => {
      await Promise.all(
        Array.from({ length: 12 }, () => rejection(login(ACTIVE, 'otra-clave-1234', deps))),
      );

      expect(attempts()).toBe(MAX);
    });

    it('con contraseñas incorrectas en paralelo no se emite ningún token', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => rejection(login(ACTIVE, 'otra-clave-1234', deps))),
      );

      expect(results.every((r) => r instanceof Error)).toBe(true);
    });
  });

  describe('fallos de infraestructura (se falla cerrado)', () => {
    it('datos no íntegros: lanza y no emite tokens', async () => {
      writeDataFile(dir, 'users', '{ roto', 2000);

      await expect(login(ACTIVE, TEST_PASSWORD, deps)).rejects.toThrow(DataIntegrityError);
    });

    it('si no se puede registrar el intento, no emite tokens', async () => {
      const failing = {
        ...deps,
        store: {
          ...deps.store!,
          updateUsers: () => Promise.reject(new Error('disco lleno')),
        },
      } as AuthDeps;

      await expect(login(ACTIVE, TEST_PASSWORD, failing)).rejects.toThrow('disco lleno');
    });
  });
});
