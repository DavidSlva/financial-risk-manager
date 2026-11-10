import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCors } from '../../src/middlewares/cors.middleware.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';

const FRONT = 'http://localhost:3000';
const OTHER = 'https://app.ejemplo.cl';

function build(origins: readonly string[]) {
  const app = express();
  app.use(createCors(origins));
  app.get('/x', (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/x', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('cors.middleware', () => {
  let single: TestServer;
  let multiple: TestServer;
  let disabled: TestServer;

  beforeAll(async () => {
    single = await startServer(build([FRONT]));
    multiple = await startServer(build([FRONT, OTHER]));
    disabled = await startServer(build([]));
  });

  afterAll(async () => {
    await Promise.all([single.close(), multiple.close(), disabled.close()]);
  });

  const request = (
    server: TestServer,
    origin: string | undefined,
    init: RequestInit = {},
    path = '/x',
  ) =>
    fetch(`${server.baseUrl}${path}`, {
      ...init,
      headers: { ...(origin === undefined ? {} : { origin }), ...(init.headers as object) },
    });

  const preflight = (server: TestServer, origin: string | undefined, method = 'POST') =>
    request(server, origin, {
      method: 'OPTIONS',
      headers: {
        'access-control-request-method': method,
        'access-control-request-headers': 'content-type',
      },
    });

  describe('origen permitido (petición normal)', () => {
    it('devuelve el origen permitido y habilita las credenciales', async () => {
      const res = await request(single, FRONT);

      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe(FRONT);
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('agrega Vary: Origin', async () => {
      expect((await request(single, FRONT)).headers.get('vary')).toMatch(/Origin/i);
    });

    it('no responde "*" nunca', async () => {
      expect((await request(single, FRONT)).headers.get('access-control-allow-origin')).not.toBe(
        '*',
      );
    });

    it('con varios orígenes devuelve el que hizo la petición, no la lista', async () => {
      const a = await request(multiple, FRONT);
      const b = await request(multiple, OTHER);

      expect(a.headers.get('access-control-allow-origin')).toBe(FRONT);
      expect(b.headers.get('access-control-allow-origin')).toBe(OTHER);
    });

    it('la petición sigue su curso hacia la ruta', async () => {
      expect(await (await request(single, FRONT)).json()).toEqual({ ok: true });
    });

    it('también aplica a POST', async () => {
      const res = await request(single, FRONT, { method: 'POST' });

      expect(res.headers.get('access-control-allow-origin')).toBe(FRONT);
    });
  });

  describe('origen no permitido', () => {
    it.each([
      'http://evil.example',
      'http://localhost:8000',
      'http://localhost:3001',
      'https://localhost:3000',
      'http://localhost:3000.evil.example',
      'http://127.0.0.1:3000',
      'null',
      'HTTP://LOCALHOST:3000',
    ])('%s: sin cabeceras CORS (no se refleja)', async (origin) => {
      const res = await request(single, origin);

      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    });

    it('un origen vacío tampoco se permite', async () => {
      const res = await request(single, '');

      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('igual agrega Vary: Origin (las cachés no deben mezclar orígenes)', async () => {
      expect((await request(single, 'http://evil.example')).headers.get('vary')).toMatch(/Origin/i);
    });
  });

  describe('preflight', () => {
    it('de un origen permitido responde 204 con métodos, cabeceras, Max-Age y credenciales', async () => {
      const res = await preflight(single, FRONT);

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe(FRONT);
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
      expect(res.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS');
      expect(res.headers.get('access-control-allow-headers')).toBe('Content-Type, Authorization');
      expect(res.headers.get('access-control-max-age')).toBe('600');
      expect(res.headers.get('vary')).toMatch(/Origin/i);
    });

    it('no llega a las rutas (no hay cuerpo)', async () => {
      const res = await preflight(single, FRONT);

      expect(await res.text()).toBe('');
    });

    it('no refleja cabeceras arbitrarias: la lista es cerrada', async () => {
      const res = await request(single, FRONT, {
        method: 'OPTIONS',
        headers: {
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'x-secreto, content-type',
        },
      });

      expect(res.headers.get('access-control-allow-headers')).not.toContain('x-secreto');
    });

    it('de un origen no permitido responde 204 sin cabeceras CORS', async () => {
      const res = await preflight(single, 'http://evil.example');

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(res.headers.get('access-control-allow-methods')).toBeNull();
      expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    });

    it('un OPTIONS sin Access-Control-Request-Method no es un preflight', async () => {
      const res = await request(single, FRONT, { method: 'OPTIONS' });

      expect(res.headers.get('access-control-allow-methods')).toBeNull();
      expect(res.status).not.toBe(204);
    });
  });

  describe('sin Origin (mismo origen o cliente que no es un navegador)', () => {
    it('no agrega cabeceras CORS y la petición sigue su curso', async () => {
      const res = await request(single, undefined);

      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    });
  });

  describe('lista vacía (CORS desactivado, p. ej. producción en el mismo dominio)', () => {
    it('no agrega nada, ni siquiera para un origen cualquiera', async () => {
      const res = await request(disabled, FRONT);

      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(res.headers.get('vary')).toBeNull();
    });

    it('el preflight no se responde especialmente (sigue a las rutas)', async () => {
      const res = await preflight(disabled, FRONT);

      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(res.status).not.toBe(204);
    });
  });
});
