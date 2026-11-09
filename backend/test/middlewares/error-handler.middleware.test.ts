import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import { AuthenticationError } from '../../src/services/auth.service.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';

describe('error-handler.middleware', () => {
  let server: TestServer;

  beforeAll(async () => {
    const app = express();
    app.get('/auth-error', () => {
      throw new AuthenticationError();
    });
    app.get('/boom', () => {
      throw new Error('detalle interno secreto');
    });
    app.use(errorHandler);
    server = await startServer(app);
  });

  afterAll(async () => {
    await server.close();
  });

  it('AuthenticationError responde 401 genérico con WWW-Authenticate', async () => {
    const res = await fetch(`${server.baseUrl}/auth-error`);

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('cualquier otro error responde 500 sin filtrar el detalle', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await fetch(`${server.baseUrl}/boom`);
    const body = await res.text();

    expect(res.status).toBe(500);
    expect(body).not.toContain('secreto');
    spy.mockRestore();
  });
});
