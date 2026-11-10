import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../src/config/http-errors.js';
import { authorize } from '../../src/middlewares/authorize.middleware.js';
import { errorHandler } from '../../src/middlewares/error-handler.middleware.js';
import type {
  AuthorizationCheck,
  AuthorizationContext,
} from '../../src/models/authorization.types.js';
import { startServer, type TestServer } from '../helpers/http-fixtures.js';

const USER = { rut: '11111111-1', role: 'user', active: true } as const;

describe('authorize.middleware', () => {
  let server: TestServer;
  let lastContext: AuthorizationContext | undefined;
  const seen = vi.fn();

  function build(check: AuthorizationCheck, withUser = true) {
    const app = express();
    app.use((req, _res, next) => {
      if (withUser) req.user = USER;
      next();
    });
    app.get('/recurso/:id', authorize(check), (_req, res) => {
      seen();
      res.json({ ok: true });
    });
    app.use(errorHandler);
    return app;
  }

  async function serve(check: AuthorizationCheck, withUser = true): Promise<TestServer> {
    server = await startServer(build(check, withUser));
    return server;
  }

  afterAll(async () => {
    await server?.close();
  });

  beforeAll(() => {
    seen.mockClear();
  });

  async function call(check: AuthorizationCheck, withUser = true, path = '/recurso/7?x=1') {
    const s = await serve(check, withUser);
    try {
      return await fetch(`${s.baseUrl}${path}`);
    } finally {
      await s.close();
    }
  }

  it('deja pasar cuando el callback devuelve true', async () => {
    seen.mockClear();

    const res = await call(() => true);

    expect(res.status).toBe(200);
    expect(seen).toHaveBeenCalledOnce();
  });

  it('responde 403 genérico cuando el callback devuelve false, sin llegar al controlador', async () => {
    seen.mockClear();

    const res = await call(() => false);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
    expect(seen).not.toHaveBeenCalled();
  });

  it('acepta un callback asíncrono', async () => {
    expect((await call(async () => true)).status).toBe(200);
    expect((await call(async () => false)).status).toBe(403);
  });

  it('entrega al callback un contexto plano con user, params y query', async () => {
    await call((context) => {
      lastContext = context;
      return true;
    });

    expect(lastContext?.user).toEqual(USER);
    expect(lastContext?.params).toEqual({ id: '7' });
    expect(lastContext?.query).toEqual({ x: '1' });
  });

  it('sin req.user responde 401 y no ejecuta el callback (authenticate faltante)', async () => {
    const check = vi.fn(() => true);

    const res = await call(check, false);

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
    expect(check).not.toHaveBeenCalled();
  });

  it('un HttpError lanzado por el callback se responde según el mapa', async () => {
    const res = await call(() => {
      throw new HttpError('NOT_FOUND');
    });

    expect(res.status).toBe(404);
  });

  it('un error inesperado del callback responde 500 genérico, nunca deja pasar', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    seen.mockClear();

    const res = await call(async () => {
      throw new Error('fallo interno secreto');
    });

    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('secreto');
    expect(seen).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('un callback que devuelve algo que no es true estricto no concede', async () => {
    const res = await call((() => 'yes') as unknown as AuthorizationCheck);

    expect(res.status).toBe(403);
  });
});
