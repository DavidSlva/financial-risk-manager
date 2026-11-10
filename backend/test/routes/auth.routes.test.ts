import express from 'express';
import { rmSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import { createAuthRouter } from '../../src/routes/auth.routes.js';
import type { AuthDeps } from '../../src/services/auth.service.js';
import { createDataStore } from '../../src/services/data-store.service.js';
import { generateTokens, verifyToken } from '../../src/services/token.service.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import {
  cookieNamed,
  setCookiesOf,
  startServer,
  type TestServer,
} from '../helpers/http-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';
import { userRow } from '../helpers/user-fixtures.js';

describe('POST /api/auth/refresh (refresh en la cookie refresh_token, spec 009)', () => {
  let dir: string;
  let deps: AuthDeps;
  let server: TestServer;

  beforeAll(async () => {
    dir = makeTempDir();
    deps = { store: createDataStore(dir), jwt: testJwtConfig() };

    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(deps));
    app.use(errorHandler);
    server = await startServer(app);
  });

  afterAll(async () => {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    writeAll(dir, validData(), Date.now() / 1000 + Math.random() * 1000);
  });

  const refreshWith = (cookie?: string, init: RequestInit = {}) =>
    fetch(`${server.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      ...init,
      headers: { ...(cookie === undefined ? {} : { cookie }), ...(init.headers as object) },
    });

  const tokens = (rut: string) => generateTokens({ rut }, deps.jwt!);

  it('entrega un access nuevo en la cookie access_token y expiresIn en el cuerpo', async () => {
    const { refreshToken } = await tokens('11111111-1');

    const res = await refreshWith(`refresh_token=${refreshToken}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ expiresIn: 900 });
    const cookie = cookieNamed(res, 'access_token');
    expect(cookie?.attributes).toMatchObject({
      httponly: true,
      samesite: 'Strict',
      path: '/',
      'max-age': '900',
    });
    await expect(verifyToken(cookie!.value, 'access', deps.jwt!)).resolves.toMatchObject({
      sub: '11111111-1',
    });
  });

  it('no entrega un refresh nuevo (sin rotación) ni tokens en el cuerpo', async () => {
    const { refreshToken } = await tokens('11111111-1');

    const res = await refreshWith(`refresh_token=${refreshToken}`);

    expect(setCookiesOf(res).map((c) => c.name)).toEqual(['access_token']);
    expect(await res.text()).not.toContain('eyJ');
  });

  it('indica Cache-Control: no-store', async () => {
    const { refreshToken } = await tokens('11111111-1');

    expect((await refreshWith(`refresh_token=${refreshToken}`)).headers.get('cache-control')).toBe(
      'no-store',
    );
  });

  it('no necesita cuerpo ni Content-Type', async () => {
    const { refreshToken } = await tokens('11111111-1');

    const res = await refreshWith(`refresh_token=${refreshToken}`, { body: undefined });

    expect(res.status).toBe(200);
  });

  it('sin cookie → 401 genérico', async () => {
    const res = await refreshWith();

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(setCookiesOf(res)).toEqual([]);
  });

  it('un refresh en el cuerpo ya no se acepta (solo la cookie)', async () => {
    const { refreshToken } = await tokens('11111111-1');

    const res = await refreshWith(undefined, {
      body: JSON.stringify({ refreshToken }),
      headers: { 'content-type': 'application/json' },
    });

    expect(res.status).toBe(401);
  });

  it('un refresh en el encabezado Authorization tampoco', async () => {
    const { refreshToken } = await tokens('11111111-1');

    const res = await refreshWith(undefined, {
      headers: { authorization: `Bearer ${refreshToken}` },
    });

    expect(res.status).toBe(401);
  });

  it.each(['refresh_token=basura', 'refresh_token=', 'refresh_token=a.b.c', 'otra=1'])(
    'cookie inválida o ausente (%s) → 401',
    async (cookie) => {
      expect((await refreshWith(cookie)).status).toBe(401);
    },
  );

  it('el access no sirve como refresh', async () => {
    const { accessToken } = await tokens('11111111-1');

    expect((await refreshWith(`refresh_token=${accessToken}`)).status).toBe(401);
  });

  it('un refresh en la cookie access_token no cuenta', async () => {
    const { refreshToken } = await tokens('11111111-1');

    expect((await refreshWith(`access_token=${refreshToken}`)).status).toBe(401);
  });

  it('usuario no vigente → 401', async () => {
    const { refreshToken } = await tokens('22222222-2');

    expect((await refreshWith(`refresh_token=${refreshToken}`)).status).toBe(401);
  });

  it('revocación: el mismo refresh deja de funcionar al marcar active=false', async () => {
    const { refreshToken } = await tokens('11111111-1');
    expect((await refreshWith(`refresh_token=${refreshToken}`)).status).toBe(200);

    writeDataFile(
      dir,
      'users',
      [userRow('11111111-1', 'admin', false), userRow('22222222-2', 'user', false)],
      Date.now() / 1000 + 5000,
    );

    expect((await refreshWith(`refresh_token=${refreshToken}`)).status).toBe(401);
  });

  it('solo acepta POST', async () => {
    const res = await fetch(`${server.baseUrl}/api/auth/refresh`);

    expect(res.status).toBe(404);
  });
});
