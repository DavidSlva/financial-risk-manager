import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpError } from '../../src/config/http-errors.js';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import { notFound } from '../../src/middlewares/not-found.middleware.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';

describe('not-found.middleware', () => {
  let server: TestServer;

  beforeAll(async () => {
    const app = express();
    app.get('/existe', (_req, res) => {
      res.json({ ok: true });
    });
    app.use(notFound);
    app.use(errorHandler);
    server = await startServer(app);
  });

  afterAll(async () => {
    await server.close();
  });

  it('delega un HttpError NOT_FOUND al manejador de errores', () => {
    let received: unknown;

    notFound({} as never, {} as never, (error?: unknown) => {
      received = error;
    });

    expect(received).toBeInstanceOf(HttpError);
    expect((received as HttpError).type).toBe('NOT_FOUND');
  });

  it('una ruta inexistente responde 404 uniforme, sin reflejar la ruta', async () => {
    const res = await fetch(`${server.baseUrl}/no-existe?x=1`);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not Found' });
  });

  it('no interfiere con las rutas existentes', async () => {
    const res = await fetch(`${server.baseUrl}/existe`);

    expect(res.status).toBe(200);
  });
});
