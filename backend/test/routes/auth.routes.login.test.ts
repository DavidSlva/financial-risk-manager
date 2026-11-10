import express from 'express';
import { readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAuthenticate } from '../../src/middlewares/authenticate.middleware.js';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import { createAuthRouter } from '../../src/routes/auth.routes.js';
import type { AuthDeps } from '../../src/services/auth.service.js';
import { createDataStore } from '../../src/services/data-store.service.js';
import { verifyToken } from '../../src/services/token.service.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import {
  cookieNamed,
  setCookiesOf,
  startServer,
  type TestServer,
} from '../helpers/http-fixtures.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';
import { TEST_PASSWORD, userRow } from '../helpers/user-fixtures.js';

const ACTIVE = '11111111-1';
const INACTIVE = '22222222-2';
const MAX = 3;

describe('POST /api/auth/login', () => {
  let dir: string;
  let deps: AuthDeps;
  let server: TestServer;
  let clock = 1000;

  beforeAll(async () => {
    dir = makeTempDir();
    deps = { store: createDataStore(dir), jwt: testJwtConfig(), loginMaxAttempts: MAX };

    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(deps));
    app.get('/api/protected', createAuthenticate(deps), (req, res) => {
      res.json({ rut: req.user?.rut, keys: Object.keys(req.user ?? {}).sort() });
    });
    app.use(errorHandler);
    server = await startServer(app);
  });

  afterAll(async () => {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    clock += 10;
    writeAll(dir, validData(), clock);
  });

  const usersFile = () => readFileSync(join(dir, 'users.json'), 'utf8');
  const attempts = () =>
    (JSON.parse(usersFile()) as { rut: string; failed_attempts: number }[]).find(
      (u) => u.rut === ACTIVE,
    )?.failed_attempts;

  function login(body: unknown, raw = false): Promise<Response> {
    return fetch(`${server.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw ? (body as string) : JSON.stringify(body),
    });
  }

  const credentials = (overrides: Record<string, unknown> = {}) => ({
    rut: ACTIVE,
    password: TEST_PASSWORD,
    ...overrides,
  });

  describe('200: contrato de salida (sesión por cookies)', () => {
    const cookieHeader = (res: Response) =>
      setCookiesOf(res)
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

    it('el cuerpo trae solo expiresIn y refreshExpiresIn', async () => {
      const res = await login(credentials());

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ expiresIn: 900, refreshExpiresIn: 604800 });
    });

    it('los tokens NO van en el cuerpo (el JavaScript del frontend no los ve)', async () => {
      const text = await (await login(credentials())).text();

      expect(text).not.toContain('eyJ');
      expect(text).not.toContain('accessToken');
      expect(text).not.toContain('refreshToken');
    });

    it('entrega exactamente access_token y refresh_token en Set-Cookie', async () => {
      const res = await login(credentials());

      expect(setCookiesOf(res).map((c) => c.name)).toEqual(['access_token', 'refresh_token']);
    });

    it('access_token: HttpOnly, SameSite=Strict, Path=/, Max-Age=900, sin Secure ni Domain', async () => {
      const cookie = cookieNamed(await login(credentials()), 'access_token');

      expect(cookie?.attributes).toMatchObject({
        httponly: true,
        samesite: 'Strict',
        path: '/',
        'max-age': '900',
      });
      expect(cookie?.attributes).not.toHaveProperty('secure');
      expect(cookie?.attributes).not.toHaveProperty('domain');
    });

    it('refresh_token: HttpOnly, SameSite=Strict, Path=/api/auth, Max-Age=604800', async () => {
      const cookie = cookieNamed(await login(credentials()), 'refresh_token');

      expect(cookie?.attributes).toMatchObject({
        httponly: true,
        samesite: 'Strict',
        path: '/api/auth',
        'max-age': '604800',
      });
      expect(cookie?.attributes).not.toHaveProperty('domain');
    });

    it('los valores son un access y un refresh válidos del usuario', async () => {
      const res = await login(credentials());

      await expect(
        verifyToken(cookieNamed(res, 'access_token')!.value, 'access', deps.jwt!),
      ).resolves.toMatchObject({ sub: ACTIVE });
      await expect(
        verifyToken(cookieNamed(res, 'refresh_token')!.value, 'refresh', deps.jwt!),
      ).resolves.toMatchObject({ sub: ACTIVE });
    });

    it('con cookies seguras (producción) ambas llevan Secure', async () => {
      const secureApp = express();
      secureApp.use(express.json());
      secureApp.use('/api/auth', createAuthRouter({ ...deps, secureCookies: true }));
      secureApp.use(errorHandler);
      const secureServer = await startServer(secureApp);
      try {
        const res = await fetch(`${secureServer.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(credentials()),
        });

        expect(res.status).toBe(200);
        for (const cookie of setCookiesOf(res)) {
          expect(cookie.attributes).toMatchObject({ secure: true, httponly: true });
        }
      } finally {
        await secureServer.close();
      }
    });

    it('indica Cache-Control: no-store', async () => {
      const res = await login(credentials());

      expect(res.headers.get('cache-control')).toBe('no-store');
    });

    it('no incluye el hash, el contador ni datos del usuario (ni en el cuerpo ni en las cookies)', async () => {
      const res = await login(credentials());
      const all = (await res.text()) + res.headers.getSetCookie().join(' ');

      expect(all).not.toContain('scrypt');
      expect(all).not.toContain('password');
      expect(all).not.toContain('failed_attempts');
      expect(all).not.toContain('role');
    });

    it('la cookie access_token emitida autentica y req.user no expone el hash', async () => {
      const res = await login(credentials());

      const protectedRes = await fetch(`${server.baseUrl}/api/protected`, {
        headers: { cookie: cookieHeader(res) },
      });

      expect(protectedRes.status).toBe(200);
      expect(await protectedRes.json()).toEqual({ rut: ACTIVE, keys: ['active', 'role', 'rut'] });
    });

    it('la cookie refresh_token emitida sirve en POST /refresh, sin cuerpo', async () => {
      const res = await login(credentials());

      const refresh = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { cookie: cookieHeader(res) },
      });

      expect(refresh.status).toBe(200);
      expect(cookieNamed(refresh, 'access_token')).toBeDefined();
    });

    it('el refresh no autentica como access_token y el access no sirve como refresh_token', async () => {
      const res = await login(credentials());
      const access = cookieNamed(res, 'access_token')!.value;
      const refresh = cookieNamed(res, 'refresh_token')!.value;

      const asAccess = await fetch(`${server.baseUrl}/api/protected`, {
        headers: { cookie: `access_token=${refresh}` },
      });
      const asRefresh = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { cookie: `refresh_token=${access}` },
      });

      expect(asAccess.status).toBe(401);
      expect(asRefresh.status).toBe(401);
    });

    it('los 400 y 401 no entregan cookies', async () => {
      const bad = await login({});
      const wrong = await login(credentials({ password: 'otra-clave-1234' }));

      expect(setCookiesOf(bad)).toEqual([]);
      expect(setCookiesOf(wrong)).toEqual([]);
    });
  });

  describe('400: contrato de entrada', () => {
    const cases: [string, unknown][] = [
      ['cuerpo vacío', {}],
      ['sin rut', { password: TEST_PASSWORD }],
      ['sin password', { rut: ACTIVE }],
      ['rut con dígito verificador incorrecto', credentials({ rut: '11111111-2' })],
      ['rut con puntos', credentials({ rut: '11.111.111-1' })],
      ['rut sin guion', credentials({ rut: '111111111' })],
      ['rut con k minúscula', credentials({ rut: '1000005-k' })],
      ['rut con espacios', credentials({ rut: ' 11111111-1' })],
      ['rut numérico', credentials({ rut: 11111111 })],
      ['rut nulo', credentials({ rut: null })],
      ['rut vacío', credentials({ rut: '' })],
      ['password de 7 caracteres', credentials({ password: 'a'.repeat(7) })],
      ['password de 129 caracteres', credentials({ password: 'a'.repeat(129) })],
      ['password vacía', credentials({ password: '' })],
      ['password numérica', credentials({ password: 12345678 })],
      ['password nula', credentials({ password: null })],
      ['password como arreglo', credentials({ password: ['12345678'] })],
      ['campo adicional', credentials({ extra: 'x' })],
      ['campo adicional que parece legítimo', credentials({ role: 'admin' })],
      ['cuerpo que es un arreglo', [credentials()]],
      ['cuerpo que es un texto', 'texto'],
      ['cuerpo nulo', null],
    ];

    it.each(cases)('%s → 400', async (_label, body) => {
      const res = await login(body);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Bad Request' });
    });

    it('JSON malformado → 400', async () => {
      expect((await login('{ roto', true)).status).toBe(400);
    });

    it('sin Content-Type JSON (no se parsea el cuerpo) → 400', async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: JSON.stringify(credentials()),
      });

      expect(res.status).toBe(400);
    });

    it('el límite de la contraseña es de 8 a 128 caracteres (inclusive)', async () => {
      expect((await login(credentials({ password: 'a'.repeat(8) }))).status).toBe(401);
      expect((await login(credentials({ password: 'a'.repeat(128) }))).status).toBe(401);
    });

    it('un contrato inválido no toca los datos ni cuenta como intento', async () => {
      const before = usersFile();
      const beforeMtime = statSync(join(dir, 'users.json')).mtimeMs;

      for (const [, body] of cases) await login(body);

      expect(usersFile()).toBe(before);
      expect(statSync(join(dir, 'users.json')).mtimeMs).toBe(beforeMtime);
    });
  });

  describe('401: indistinguibles', () => {
    async function snapshot(res: Response) {
      return {
        status: res.status,
        body: await res.text(),
        wwwAuthenticate: res.headers.get('www-authenticate'),
        contentType: res.headers.get('content-type'),
      };
    }

    it('rut inexistente, contraseña incorrecta, no vigente y bloqueado responden igual', async () => {
      const unknown = await snapshot(await login(credentials({ rut: '99999999-9' })));
      const wrong = await snapshot(await login(credentials({ password: 'otra-clave-1234' })));
      const inactive = await snapshot(await login(credentials({ rut: INACTIVE })));

      writeDataFile(
        dir,
        'users',
        [
          userRow(ACTIVE, 'admin', true, { failed_attempts: MAX }),
          userRow(INACTIVE, 'user', false),
        ],
        (clock += 10) + 5000,
      );
      const locked = await snapshot(await login(credentials()));

      for (const result of [unknown, wrong, inactive, locked]) {
        expect(result).toEqual(unknown);
      }
      expect(unknown.status).toBe(401);
      expect(unknown.body).toBe(JSON.stringify({ error: 'Unauthorized' }));
      expect(unknown.wwwAuthenticate).toBe('Bearer');
    });

    it('no repite la contraseña ni el rut en la respuesta', async () => {
      const text = await (await login(credentials({ password: 'clave-secreta-123' }))).text();

      expect(text).not.toContain('clave-secreta-123');
      expect(text).not.toContain(ACTIVE);
    });
  });

  describe('límite de intentos', () => {
    it('los intentos fallidos incrementan el contador', async () => {
      await login(credentials({ password: 'otra-clave-1234' }));
      await login(credentials({ password: 'otra-clave-1234' }));

      expect(attempts()).toBe(2);
    });

    it('un login exitoso reinicia el contador', async () => {
      await login(credentials({ password: 'otra-clave-1234' }));
      await login(credentials({ password: 'otra-clave-1234' }));

      const res = await login(credentials());

      expect(res.status).toBe(200);
      expect(attempts()).toBe(0);
    });

    it('tras el máximo de intentos fallidos, ni la contraseña correcta entra', async () => {
      for (let i = 0; i < MAX; i += 1) {
        expect((await login(credentials({ password: 'otra-clave-1234' }))).status).toBe(401);
      }

      const res = await login(credentials());

      expect(res.status).toBe(401);
      expect(attempts()).toBe(MAX);
    });

    it('el operador desbloquea poniendo el contador en 0', async () => {
      writeDataFile(
        dir,
        'users',
        [
          userRow(ACTIVE, 'admin', true, { failed_attempts: MAX }),
          userRow(INACTIVE, 'user', false),
        ],
        (clock += 10) + 5000,
      );
      expect((await login(credentials())).status).toBe(401);

      writeDataFile(
        dir,
        'users',
        [userRow(ACTIVE, 'admin', true), userRow(INACTIVE, 'user', false)],
        (clock += 10) + 6000,
      );

      expect((await login(credentials())).status).toBe(200);
    });

    it('con peticiones concurrentes fallidas el contador no supera el máximo', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => login(credentials({ password: 'otra-clave-1234' }))),
      );

      expect(results.every((r) => r.status === 401)).toBe(true);
      expect(attempts()).toBe(MAX);
    });

    it('un usuario no se bloquea por los intentos de otro', async () => {
      for (let i = 0; i < MAX; i += 1)
        await login(credentials({ rut: INACTIVE, password: 'x'.repeat(8) }));

      expect((await login(credentials())).status).toBe(200);
    });
  });

  describe('fallos de infraestructura', () => {
    it('con datos no íntegros responde 500 genérico, nunca 200', async () => {
      writeDataFile(dir, 'users', '{ roto', (clock += 10) + 5000);

      const res = await login(credentials());

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Internal Server Error' });
    });
  });

  it('solo acepta POST', async () => {
    const res = await fetch(`${server.baseUrl}/api/auth/login`);

    expect(res.status).toBe(404);
  });
});
