import express from 'express';
import { rmSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAuthenticate } from '../../src/middlewares/authenticate.middleware.js';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import type { AuthDeps } from '../../src/services/auth.service.js';
import { createDataStore } from '../../src/services/data-store.service.js';
import { generateTokens } from '../../src/services/token.service.js';
import { makeTempDir, validData, writeAll } from '../helpers/data-fixtures.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';

describe('authenticate.middleware › access desde la cookie access_token (spec 009)', () => {
  let dir: string;
  let deps: AuthDeps;
  let server: TestServer;

  beforeAll(async () => {
    dir = makeTempDir();
    deps = { store: createDataStore(dir), jwt: testJwtConfig() };

    const app = express();
    app.get('/protected', createAuthenticate(deps), (req, res) => {
      res.json({ rut: req.user?.rut, role: req.user?.role });
    });
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

  const getWith = (headers: Record<string, string>) =>
    fetch(`${server.baseUrl}/protected`, { headers });
  const tokens = (rut: string) => generateTokens({ rut }, deps.jwt!);

  it('autentica con la cookie y expone req.user', async () => {
    const { accessToken } = await tokens('11111111-1');

    const res = await getWith({ cookie: `access_token=${accessToken}` });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rut: '11111111-1', role: 'admin' });
  });

  it('encuentra la cookie entre otras', async () => {
    const { accessToken } = await tokens('11111111-1');

    const res = await getWith({ cookie: `otra=1; access_token=${accessToken}; x=y` });

    expect(res.status).toBe(200);
  });

  it('con cookie y Bearer a la vez vale solo la cookie (cookie válida, Bearer inválido)', async () => {
    const { accessToken } = await tokens('11111111-1');

    const res = await getWith({
      cookie: `access_token=${accessToken}`,
      authorization: 'Bearer basura',
    });

    expect(res.status).toBe(200);
  });

  it('con cookie inválida y Bearer válido → 401 (no se mezclan)', async () => {
    const { accessToken } = await tokens('11111111-1');

    const res = await getWith({
      cookie: 'access_token=basura',
      authorization: `Bearer ${accessToken}`,
    });

    expect(res.status).toBe(401);
  });

  it('una cookie access_token vacía es un 401 (no cae al Bearer)', async () => {
    const { accessToken } = await tokens('11111111-1');

    const res = await getWith({
      cookie: 'access_token=',
      authorization: `Bearer ${accessToken}`,
    });

    expect(res.status).toBe(401);
  });

  it('el refresh en la cookie access_token no autentica', async () => {
    const { refreshToken } = await tokens('11111111-1');

    expect((await getWith({ cookie: `access_token=${refreshToken}` })).status).toBe(401);
  });

  it('la cookie refresh_token no autentica aunque sea válida', async () => {
    const { refreshToken } = await tokens('11111111-1');

    expect((await getWith({ cookie: `refresh_token=${refreshToken}` })).status).toBe(401);
  });

  it('usuario no vigente con cookie válida → 401', async () => {
    const { accessToken } = await tokens('22222222-2');

    expect((await getWith({ cookie: `access_token=${accessToken}` })).status).toBe(401);
  });

  it('sin cookie ni Authorization → 401 genérico', async () => {
    const res = await getWith({});

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});
