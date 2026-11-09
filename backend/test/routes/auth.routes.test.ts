import express from 'express';
import { rmSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import { createAuthRouter } from '../../src/routes/auth.routes.js';
import type { AuthDeps } from '../../src/services/auth.service.js';
import { createDataStore } from '../../src/services/data-store.service.js';
import { generateTokens, verifyToken } from '../../src/services/token.service.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';

describe('POST /api/auth/refresh', () => {
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

  function refresh(body: unknown): Promise<Response> {
    return fetch(`${server.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('devuelve un access nuevo y válido para un refresh vigente', async () => {
    const { refreshToken } = await generateTokens({ rut: '11111111-1' }, deps.jwt!);

    const res = await refresh({ refreshToken });
    const body = (await res.json()) as { accessToken: string; expiresIn: number };

    expect(res.status).toBe(200);
    expect(body.expiresIn).toBe(900);
    expect(Object.keys(body).sort()).toEqual(['accessToken', 'expiresIn']);
    await expect(verifyToken(body.accessToken, 'access', deps.jwt!)).resolves.toBeDefined();
  });

  it.each([
    ['sin cuerpo', {}],
    ['refreshToken no es texto', { refreshToken: 123 }],
    ['refreshToken vacío', { refreshToken: '' }],
  ])('400 si la petición es malformada: %s', async (_label, body) => {
    expect((await refresh(body)).status).toBe(400);
  });

  it('401 genérico con un token basura', async () => {
    const res = await refresh({ refreshToken: 'basura' });

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('el access no refresca', async () => {
    const { accessToken } = await generateTokens({ rut: '11111111-1' }, deps.jwt!);

    expect((await refresh({ refreshToken: accessToken })).status).toBe(401);
  });

  it('401 para un usuario no vigente', async () => {
    const { refreshToken } = await generateTokens({ rut: '22222222-2' }, deps.jwt!);

    expect((await refresh({ refreshToken })).status).toBe(401);
  });

  it('revocación: el mismo refresh deja de funcionar al marcar active=false', async () => {
    const { refreshToken } = await generateTokens({ rut: '11111111-1' }, deps.jwt!);
    expect((await refresh({ refreshToken })).status).toBe(200);

    writeDataFile(
      dir,
      'users',
      [
        { rut: '11111111-1', role: 'admin', active: false },
        { rut: '22222222-2', role: 'user', active: false },
      ],
      Date.now() / 1000 + 5000,
    );

    expect((await refresh({ refreshToken })).status).toBe(401);
  });

  it('solo acepta POST', async () => {
    const res = await fetch(`${server.baseUrl}/api/auth/refresh`);

    expect(res.status).toBe(404);
  });
});
