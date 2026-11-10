import express from 'express';
import { rmSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import { createScoresRouter } from '../../src/routes/scores.routes.js';
import type { AuthDeps } from '../../src/services/auth.service.js';
import { createDataStore } from '../../src/services/data-store.service.js';
import { generateTokens } from '../../src/services/token.service.js';
import { makeTempDir, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';
import {
  ADMIN,
  AUDITOR,
  BLOCKED,
  GUEST,
  REVOKED_ADMIN,
  UNKNOWN_RUT,
  USER_WITHOUT_SCORE,
  USER_WITH_SCORE,
  scoreScenario,
} from '../helpers/score-fixtures.js';

describe('GET /api/score/:rut', () => {
  let dir: string;
  let deps: AuthDeps;
  let server: TestServer;
  let clock = 1000;

  beforeAll(async () => {
    dir = makeTempDir();
    deps = { store: createDataStore(dir), jwt: testJwtConfig() };

    const app = express();
    app.use(express.json());
    app.use('/api/score', createScoresRouter(deps));
    app.use(errorHandler);
    server = await startServer(app);
  });

  afterAll(async () => {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    clock += 10;
    writeAll(dir, scoreScenario(), clock);
  });

  async function accessFor(rut: string): Promise<string> {
    return (await generateTokens({ rut }, deps.jwt!)).accessToken;
  }

  async function getScore(as: string | undefined, rut: string): Promise<Response> {
    const headers: Record<string, string> = {};
    if (as !== undefined) headers.authorization = `Bearer ${as}`;
    return fetch(`${server.baseUrl}/api/score/${encodeURIComponent(rut)}`, { headers });
  }

  describe('autenticación', () => {
    it('sin token → 401', async () => {
      const res = await getScore(undefined, ADMIN);

      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toBe('Bearer');
    });

    it('token basura → 401', async () => {
      expect((await getScore('basura', ADMIN)).status).toBe(401);
    });

    it('un refresh no autentica → 401', async () => {
      const { refreshToken } = await generateTokens({ rut: ADMIN }, deps.jwt!);

      expect((await getScore(refreshToken, ADMIN)).status).toBe(401);
    });

    it('usuario no vigente con un access válido → 401', async () => {
      expect((await getScore(await accessFor(REVOKED_ADMIN), ADMIN)).status).toBe(401);
    });
  });

  describe('can_get_all_score (admin)', () => {
    it('ve el score de otro rut → 200', async () => {
      const res = await getScore(await accessFor(ADMIN), USER_WITH_SCORE);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ rut: USER_WITH_SCORE, score: 650 });
    });

    it('ve el propio → 200', async () => {
      const res = await getScore(await accessFor(ADMIN), ADMIN);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ rut: ADMIN, score: 780 });
    });

    it('rut inexistente → 404', async () => {
      const res = await getScore(await accessFor(ADMIN), UNKNOWN_RUT);

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Not Found' });
    });

    it('usuario sin score → 404', async () => {
      expect((await getScore(await accessFor(ADMIN), USER_WITHOUT_SCORE)).status).toBe(404);
    });
  });

  describe('can_get_score (user)', () => {
    it('ve su propio score → 200', async () => {
      const res = await getScore(await accessFor(USER_WITH_SCORE), USER_WITH_SCORE);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ rut: USER_WITH_SCORE, score: 650 });
    });

    it('el score de otro rut existente → 403', async () => {
      const res = await getScore(await accessFor(USER_WITH_SCORE), ADMIN);

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Forbidden' });
    });

    it('un rut inexistente → el mismo 403 (no revela qué ruts existen)', async () => {
      const token = await accessFor(USER_WITH_SCORE);
      const existing = await getScore(token, ADMIN);
      const missing = await getScore(token, UNKNOWN_RUT);

      expect(missing.status).toBe(403);
      expect(await missing.text()).toBe(await existing.text());
    });

    it('su propio rut sin score → 404', async () => {
      expect((await getScore(await accessFor(USER_WITHOUT_SCORE), USER_WITHOUT_SCORE)).status).toBe(
        404,
      );
    });

    it('no puede usar la query para suplantar otro rut', async () => {
      const res = await fetch(`${server.baseUrl}/api/score/${ADMIN}?rut=${USER_WITH_SCORE}`, {
        headers: { authorization: `Bearer ${await accessFor(USER_WITH_SCORE)}` },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('otros roles', () => {
    it('can_get_all_score sin can_get_score (auditor): ve a cualquiera → 200', async () => {
      expect((await getScore(await accessFor(AUDITOR), USER_WITH_SCORE)).status).toBe(200);
    });

    it('auditor sobre su propio rut sin score → 404', async () => {
      expect((await getScore(await accessFor(AUDITOR), AUDITOR)).status).toBe(404);
    });

    it('sin permisos (guest) → 403 incluso sobre su propio rut', async () => {
      expect((await getScore(await accessFor(GUEST), GUEST)).status).toBe(403);
    });

    it('permiso propio negado (blocked) → 403 incluso sobre su propio rut', async () => {
      expect((await getScore(await accessFor(BLOCKED), BLOCKED)).status).toBe(403);
    });
  });

  describe('cambios sin reiniciar', () => {
    it('revocar al usuario (active=false) → 401 en la siguiente petición', async () => {
      const token = await accessFor(ADMIN);
      expect((await getScore(token, USER_WITH_SCORE)).status).toBe(200);

      const scenario = scoreScenario();
      scenario.users = (scenario.users as { rut: string }[]).map((u) =>
        u.rut === ADMIN ? { ...u, active: false } : u,
      );
      writeDataFile(dir, 'users', scenario.users, (clock += 10) + 5000);

      expect((await getScore(token, USER_WITH_SCORE)).status).toBe(401);
    });

    it('quitar un permiso → 403 en la siguiente petición', async () => {
      const token = await accessFor(ADMIN);
      expect((await getScore(token, USER_WITH_SCORE)).status).toBe(200);

      writeDataFile(
        dir,
        'permissions',
        [{ role: 'admin', key: 'can_get_score', value: true }],
        (clock += 10) + 5000,
      );

      expect((await getScore(token, USER_WITH_SCORE)).status).toBe(403);
    });

    it('con permisos corruptos no concede nada (500, nunca 200)', async () => {
      const token = await accessFor(ADMIN);
      writeDataFile(dir, 'permissions', '{ roto', (clock += 10) + 5000);

      expect((await getScore(token, USER_WITH_SCORE)).status).toBe(500);
    });
  });

  it('solo acepta GET', async () => {
    const res = await fetch(`${server.baseUrl}/api/score/${ADMIN}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await accessFor(ADMIN)}` },
    });

    expect(res.status).toBe(404);
  });
});
