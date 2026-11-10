import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const FRONT = 'http://localhost:3000';

async function listen(app: ReturnType<typeof createApp>): Promise<{ server: Server; url: string }> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

describe('app › CORS (spec 014)', () => {
  let withDefaults: { server: Server; url: string };
  let withOtherOrigin: { server: Server; url: string };
  let withoutCors: { server: Server; url: string };

  beforeAll(async () => {
    // Por defecto (NODE_ENV=test): el frontend de desarrollo en http://localhost:3000.
    withDefaults = await listen(createApp());
    withOtherOrigin = await listen(createApp({ corsOrigins: ['http://localhost:5173'] }));
    withoutCors = await listen(createApp({ corsOrigins: [] }));
  });

  afterAll(() => {
    for (const { server } of [withDefaults, withOtherOrigin, withoutCors]) server.close();
  });

  const preflight = (base: string, origin: string, path = '/api/auth/login') =>
    fetch(`${base}${path}`, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

  it('por defecto permite el frontend local en el preflight del login', async () => {
    const res = await preflight(withDefaults.url, FRONT);

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(FRONT);
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('access-control-allow-headers')).toContain('Content-Type');
  });

  it('el preflight se responde para cualquier ruta, incluso las protegidas', async () => {
    const res = await preflight(withDefaults.url, FRONT, '/api/score/11111111-1');

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(FRONT);
  });

  it('un origen que no está en la lista no recibe cabeceras CORS', async () => {
    const res = await preflight(withDefaults.url, 'http://evil.example');

    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('la respuesta real del login incluye las cabeceras CORS para el frontend permitido', async () => {
    const res = await fetch(`${withDefaults.url}/api/auth/login`, {
      method: 'POST',
      headers: { origin: FRONT, 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(res.headers.get('access-control-allow-origin')).toBe(FRONT);
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('los errores (401) también llevan las cabeceras CORS: el frontend puede leerlos', async () => {
    const res = await fetch(`${withDefaults.url}/api/score/11111111-1`, {
      headers: { origin: FRONT },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get('access-control-allow-origin')).toBe(FRONT);
  });

  it('un 404 de ruta inexistente también lleva las cabeceras CORS', async () => {
    const res = await fetch(`${withDefaults.url}/api/no-existe`, { headers: { origin: FRONT } });

    expect(res.status).toBe(404);
    expect(res.headers.get('access-control-allow-origin')).toBe(FRONT);
  });

  it('la lista se puede cambiar (p. ej. otro puerto del frontend)', async () => {
    const allowed = await preflight(withOtherOrigin.url, 'http://localhost:5173');
    const denied = await preflight(withOtherOrigin.url, FRONT);

    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('con la lista vacía (producción, mismo dominio) no hay cabeceras CORS', async () => {
    const res = await fetch(`${withoutCors.url}/api/health`, { headers: { origin: FRONT } });

    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('las peticiones sin Origin (mismo origen) funcionan igual', async () => {
    const res = await fetch(`${withDefaults.url}/api/health`);

    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
