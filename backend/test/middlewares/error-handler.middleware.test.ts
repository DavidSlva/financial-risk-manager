import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HTTP_ERRORS, HttpError, type HttpErrorType } from '../../src/config/http-errors.js';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';

describe('error-handler.middleware', () => {
  let server: TestServer;

  beforeAll(async () => {
    const app = express();
    app.get('/http/:type', (req) => {
      throw new HttpError(req.params.type as HttpErrorType);
    });
    app.get('/boom', () => {
      throw new Error('detalle interno secreto');
    });
    app.get('/status/:status', (req) => {
      throw Object.assign(new Error('error de una librería, detalle secreto'), {
        status: Number(req.params.status),
      });
    });
    app.use(errorHandler);
    server = await startServer(app);
  });

  afterAll(async () => {
    await server.close();
  });

  it.each(Object.entries(HTTP_ERRORS))('HttpError %s responde según el mapa', async (type, def) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await fetch(`${server.baseUrl}/http/${type}`);

    expect(res.status).toBe(def.status);
    expect(await res.json()).toEqual({ error: def.message });
    for (const [name, value] of Object.entries('headers' in def ? def.headers : {})) {
      expect(res.headers.get(name)).toBe(value);
    }
    spy.mockRestore();
  });

  it('UNAUTHORIZED incluye WWW-Authenticate: Bearer', async () => {
    const res = await fetch(`${server.baseUrl}/http/UNAUTHORIZED`);

    expect(res.headers.get('www-authenticate')).toBe('Bearer');
  });

  it('FORBIDDEN no agrega cabeceras de autenticación', async () => {
    const res = await fetch(`${server.baseUrl}/http/FORBIDDEN`);

    expect(res.headers.get('www-authenticate')).toBeNull();
  });

  it('un error cualquiera responde 500 sin filtrar el detalle y lo registra', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await fetch(`${server.baseUrl}/boom`);
    const body = await res.text();

    expect(res.status).toBe(500);
    expect(body).toBe(JSON.stringify({ error: HTTP_ERRORS.INTERNAL_SERVER_ERROR.message }));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('un error con status soportado se traduce al tipo del mapa, sin su detalle', async () => {
    const res = await fetch(`${server.baseUrl}/status/400`);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: HTTP_ERRORS.BAD_REQUEST.message });
  });

  it('un error con status no soportado responde 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await fetch(`${server.baseUrl}/status/418`);

    expect(res.status).toBe(500);
    spy.mockRestore();
  });

  it('un HttpError con 500 también se registra', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await fetch(`${server.baseUrl}/http/INTERNAL_SERVER_ERROR`);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
