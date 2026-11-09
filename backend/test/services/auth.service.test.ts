import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  authenticateAccess,
  refreshAccess,
  type AuthDeps,
} from '../../src/services/auth.service.js';
import { createDataStore, DataIntegrityError } from '../../src/services/data-store.service.js';
import { verifyToken, generateTokens } from '../../src/services/token.service.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';

const ADMIN = { rut: '11111111-1' }; // active: true
const REVOKED = { rut: '22222222-2' }; // active: false

describe('auth.service (validador con vigencia)', () => {
  let dir: string;
  let deps: AuthDeps;

  beforeEach(() => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
    deps = { store: createDataStore(dir), jwt: testJwtConfig() };
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function setUsers(users: unknown, mtime: number): void {
    writeDataFile(dir, 'users', users, mtime);
  }

  describe('authenticateAccess', () => {
    it('devuelve el usuario vigente', async () => {
      const { accessToken } = await generateTokens(ADMIN, deps.jwt!);

      await expect(authenticateAccess(accessToken, deps)).resolves.toEqual({
        rut: '11111111-1',
        role: 'admin',
        active: true,
      });
    });

    it('el refresh no autentica', async () => {
      const { refreshToken } = await generateTokens(ADMIN, deps.jwt!);

      await expect(authenticateAccess(refreshToken, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('rechaza un token inválido', async () => {
      await expect(authenticateAccess('basura', deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('rechaza un token de un usuario que no existe', async () => {
      const { accessToken } = await generateTokens({ rut: '99999999-9' }, deps.jwt!);

      await expect(authenticateAccess(accessToken, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('rechaza un access firmado válido de un usuario no vigente', async () => {
      const { accessToken } = await generateTokens(REVOKED, deps.jwt!);

      await expect(authenticateAccess(accessToken, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('revocación: deja de autenticar al marcar active=false, sin reiniciar', async () => {
      const { accessToken } = await generateTokens(ADMIN, deps.jwt!);
      await expect(authenticateAccess(accessToken, deps)).resolves.toBeDefined();

      setUsers(
        [
          { rut: '11111111-1', role: 'admin', active: false },
          { rut: '22222222-2', role: 'user', active: false },
        ],
        2000,
      );

      await expect(authenticateAccess(accessToken, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('reactivación: vuelve a autenticar al marcar active=true', async () => {
      const { accessToken } = await generateTokens(REVOKED, deps.jwt!);
      await expect(authenticateAccess(accessToken, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });

      setUsers(
        [
          { rut: '11111111-1', role: 'admin', active: true },
          { rut: '22222222-2', role: 'user', active: true },
        ],
        2000,
      );

      await expect(authenticateAccess(accessToken, deps)).resolves.toMatchObject({
        rut: '22222222-2',
      });
    });

    it('el rol sale de users.json en el momento, no del token', async () => {
      const { accessToken } = await generateTokens(ADMIN, deps.jwt!);

      setUsers(
        [
          { rut: '11111111-1', role: 'user', active: true },
          { rut: '22222222-2', role: 'user', active: false },
        ],
        2000,
      );

      await expect(authenticateAccess(accessToken, deps)).resolves.toMatchObject({ role: 'user' });
    });

    it('falla cerrado si los datos no son íntegros (no autentica)', async () => {
      const { accessToken } = await generateTokens(ADMIN, deps.jwt!);
      setUsers('{ roto', 2000);

      await expect(authenticateAccess(accessToken, deps)).rejects.toThrow(DataIntegrityError);
    });

    it('el mensaje de rechazo es el mismo sea cual sea la causa', async () => {
      const refresh = (await generateTokens(ADMIN, deps.jwt!)).refreshToken;
      const revoked = (await generateTokens(REVOKED, deps.jwt!)).accessToken;
      const messages = await Promise.all(
        ['basura', refresh, revoked].map((token) =>
          authenticateAccess(token, deps).catch((e: Error) => e.message),
        ),
      );

      expect(new Set(messages).size).toBe(1);
    });
  });

  describe('refreshAccess', () => {
    it('devuelve un access nuevo y válido', async () => {
      const { refreshToken } = await generateTokens(ADMIN, deps.jwt!);

      const result = await refreshAccess(refreshToken, deps);

      expect(result.expiresIn).toBe(900);
      await expect(verifyToken(result.accessToken, 'access', deps.jwt!)).resolves.toMatchObject({
        sub: '11111111-1',
      });
    });

    it('no entrega un refresh nuevo (sin rotación)', async () => {
      const { refreshToken } = await generateTokens(ADMIN, deps.jwt!);

      expect(Object.keys(await refreshAccess(refreshToken, deps)).sort()).toEqual([
        'accessToken',
        'expiresIn',
      ]);
    });

    it('el access no sirve para refrescar', async () => {
      const { accessToken } = await generateTokens(ADMIN, deps.jwt!);

      await expect(refreshAccess(accessToken, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('rechaza un refresh inválido', async () => {
      await expect(refreshAccess('basura', deps)).rejects.toMatchObject({ type: 'UNAUTHORIZED' });
    });

    it('rechaza un refresh válido de un usuario no vigente', async () => {
      const { refreshToken } = await generateTokens(REVOKED, deps.jwt!);

      await expect(refreshAccess(refreshToken, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('revocación: un refresh ya emitido deja de generar access al marcar active=false', async () => {
      const { refreshToken } = await generateTokens(ADMIN, deps.jwt!);
      await expect(refreshAccess(refreshToken, deps)).resolves.toBeDefined();

      setUsers(
        [
          { rut: '11111111-1', role: 'admin', active: false },
          { rut: '22222222-2', role: 'user', active: false },
        ],
        2000,
      );

      await expect(refreshAccess(refreshToken, deps)).rejects.toMatchObject({
        type: 'UNAUTHORIZED',
      });
    });

    it('falla cerrado si los datos no son íntegros (no emite access)', async () => {
      const { refreshToken } = await generateTokens(ADMIN, deps.jwt!);
      setUsers('{ roto', 2000);

      await expect(refreshAccess(refreshToken, deps)).rejects.toThrow(DataIntegrityError);
    });
  });
});
