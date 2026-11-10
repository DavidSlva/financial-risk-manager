import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLoginClient } from '../../src/api/login.client.js';

const creds = { rut: '12345678-5', password: '  pass word  ' };

function res(status: number, body?: string): Response {
  return new Response(body ?? '', { status });
}
function fetchOf(response: Response | (() => never)) {
  return vi.fn<typeof fetch>(async () => {
    if (typeof response === 'function') return response();
    return response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createLoginClient', () => {
  it('envía la petición exacta del contrato', async () => {
    const f = fetchOf(res(200, JSON.stringify({ expiresIn: 900, refreshExpiresIn: 604800 })));
    const controller = new AbortController();
    await createLoginClient(f)(creds, { signal: controller.signal });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe('/api/auth/login');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    expect(init?.signal).toBe(controller.signal);
    expect(init?.body).toBe('{"rut":"12345678-5","password":"  pass word  "}');
    expect(Object.keys(JSON.parse(init?.body as string))).toEqual(['rut', 'password']);
  });

  it('200 válido devuelve ok', async () => {
    const f = fetchOf(res(200, JSON.stringify({ expiresIn: 900, refreshExpiresIn: 604800 })));
    expect(await createLoginClient(f)(creds)).toEqual({
      kind: 'ok',
      expiresIn: 900,
      refreshExpiresIn: 604800,
    });
  });

  it.each([
    ['sin expiresIn', JSON.stringify({ refreshExpiresIn: 1 })],
    ['sin refreshExpiresIn', JSON.stringify({ expiresIn: 1 })],
    ['no JSON', 'no es json'],
    ['vacío', ''],
    ['null', 'null'],
    ['arreglo', '[]'],
    ['no numéricos', JSON.stringify({ expiresIn: '900', refreshExpiresIn: 1 })],
    ['no finitos', '{"expiresIn": 1e999, "refreshExpiresIn": 1}'],
  ])('200 mal formado (%s) es malformed', async (_name, body) => {
    const out = await createLoginClient(fetchOf(res(200, body)))(creds);
    expect(out).toEqual({
      kind: 'error',
      reason: 'malformed',
      status: 200,
      messageKey: 'login.errors.serverError',
    });
  });

  it.each([
    [400, 'bad-request', 'login.errors.badRequest'],
    [401, 'unauthorized', 'login.errors.invalidCredentials'],
    [403, 'client-error', 'login.errors.clientError'],
    [404, 'client-error', 'login.errors.clientError'],
    [418, 'client-error', 'login.errors.clientError'],
    [429, 'too-many-requests', 'login.errors.tooManyRequests'],
    [500, 'server-error', 'login.errors.serverError'],
    [503, 'server-error', 'login.errors.serverError'],
  ])('status %i -> %s', async (status, reason, messageKey) => {
    const out = await createLoginClient(
      fetchOf(res(status, JSON.stringify({ error: 'TEXTO-DEL-SERVIDOR' }))),
    )(creds);
    expect(out).toEqual({ kind: 'error', reason, status, messageKey });
    expect(JSON.stringify(out)).not.toContain('TEXTO-DEL-SERVIDOR');
  });

  it('un fetch que lanza es network, sin filtrar datos', async () => {
    const out = await createLoginClient(
      fetchOf(() => {
        throw new TypeError('Failed to fetch');
      }),
    )(creds);
    expect(out).toEqual({ kind: 'error', reason: 'network', messageKey: 'login.errors.network' });
  });

  it('relanza AbortError', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    const client = createLoginClient(
      fetchOf(() => {
        throw abort;
      }),
    );
    await expect(client(creds)).rejects.toBe(abort);
  });

  it('no toca almacenamiento ni consola', async () => {
    const spies = [
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'getItem'),
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'debug'),
    ];
    await createLoginClient(fetchOf(res(401)))(creds);
    await createLoginClient(
      fetchOf(() => {
        throw new TypeError('x');
      }),
    )(creds);
    await createLoginClient(fetchOf(res(200, 'basura')))(creds);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
