import express from 'express';
import { rmSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import { createAuthenticate } from '../../src/middlewares/authenticate.middleware.js';
import type { AuthDeps } from '../../src/services/auth.service.js';
import { createDataStore } from '../../src/services/data-store.service.js';
import { generateTokens } from '../../src/services/token.service.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';

describe('authenticate.middleware', () => {
  let dir: string;
  let deps: AuthDeps;
  let server: TestServer;

  beforeAll(async () => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
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

  afterEach(() => {
    // los archivos se restauran en beforeEach
  });

  function get(authorization?: string): Promise<Response> {
    return fetch(`${server.baseUrl}/protected`, {
      headers: authorization === undefined ? {} : { authorization },
    });
  }

  it('deja pasar un access válido y expone req.user', async () => {
    const { accessToken } = await generateTokens({ rut: '11111111-1' }, deps.jwt!);

    const res = await get(`Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rut: '11111111-1', role: 'admin' });
  });

  it.each([
    ['sin cabecera Authorization', undefined],
    ['esquema distinto de Bearer', 'Basic abc'],
    ['Bearer sin token', 'Bearer'],
    ['token basura', 'Bearer basura'],
  ])('401 genérico: %s', async (_label, header) => {
    const res = await get(header);

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('el refresh no autentica', async () => {
    const { refreshToken } = await generateTokens({ rut: '11111111-1' }, deps.jwt!);

    const res = await get(`Bearer ${refreshToken}`);

    expect(res.status).toBe(401);
  });

  it('401 para un usuario no vigente', async () => {
    const { accessToken } = await generateTokens({ rut: '22222222-2' }, deps.jwt!);

    const res = await get(`Bearer ${accessToken}`);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('revocación: el mismo access deja de pasar al marcar active=false', async () => {
    const { accessToken } = await generateTokens({ rut: '11111111-1' }, deps.jwt!);
    expect((await get(`Bearer ${accessToken}`)).status).toBe(200);

    writeDataFile(
      dir,
      'users',
      [
        { rut: '11111111-1', role: 'admin', active: false },
        { rut: '22222222-2', role: 'user', active: false },
      ],
      Date.now() / 1000 + 5000,
    );

    expect((await get(`Bearer ${accessToken}`)).status).toBe(401);
  });

  it('con datos corruptos no autentica (500 genérico, nunca 200)', async () => {
    const { accessToken } = await generateTokens({ rut: '11111111-1' }, deps.jwt!);
    writeDataFile(dir, 'users', '{ roto', Date.now() / 1000 + 6000);

    const res = await get(`Bearer ${accessToken}`);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal Server Error' });
  });
});
