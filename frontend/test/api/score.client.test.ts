import { describe, expect, it, vi } from 'vitest';

import { createScoreClient } from '../../src/api/score.client.js';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const okBody = { rut: '12.345.678-9', score: 73, consulted_at: '2025-06-27T14:35:00Z' };

const clientWith = (impl: () => Promise<Response>) =>
  createScoreClient(vi.fn(impl) as unknown as typeof fetch);

describe('createScoreClient', () => {
  it('200 válido devuelve ok', async () => {
    const out = await clientWith(async () => json(okBody))('12345678-5');
    expect(out).toEqual({
      kind: 'ok',
      rut: '12.345.678-9',
      score: 73,
      consultedAt: '2025-06-27T14:35:00Z',
    });
  });

  it('usa GET, credentials include, Accept y encodeURIComponent', async () => {
    const f = vi.fn(async () => json(okBody));
    const ctrl = new AbortController();
    await createScoreClient(f as unknown as typeof fetch)('1/2?x', { signal: ctrl.signal });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/score/${encodeURIComponent('1/2?x')}`);
    expect(init.credentials).toBe('include');
    expect(init.signal).toBe(ctrl.signal);
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
    expect(init.method === undefined || init.method === 'GET').toBe(true);
  });

  it.each([
    [400, 'invalid-rut', 'score.errors.invalidRut'],
    [401, 'unauthorized', 'score.errors.sessionExpired'],
    [403, 'forbidden', 'score.errors.forbidden'],
    [404, 'not-found', 'score.errors.notFound'],
    [418, 'client-error', 'score.errors.clientError'],
    [500, 'server-error', 'score.errors.serverError'],
    [503, 'server-error', 'score.errors.serverError'],
  ])('status %i -> %s', async (status, reason, key) => {
    const out = await clientWith(async () => json({ error: 'texto del servidor' }, status))('1-9');
    expect(out).toEqual({ kind: 'error', reason, status, messageKey: key });
    expect(JSON.stringify(out)).not.toContain('texto del servidor');
  });

  it('red caída -> network', async () => {
    const out = await clientWith(async () => {
      throw new TypeError('Failed to fetch');
    })('1-9');
    expect(out).toEqual({ kind: 'error', reason: 'network', messageKey: 'score.errors.network' });
  });

  it('AbortError se relanza', async () => {
    const c = clientWith(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(c('1-9')).rejects.toMatchObject({ name: 'AbortError' });
  });

  it.each([
    ['score string', { ...okBody, score: '73' }],
    ['score null (NaN/Infinity)', { ...okBody, score: null }],
    ['consulted_at ausente', { rut: okBody.rut, score: 73 }],
    ['consulted_at inválida', { ...okBody, consulted_at: 'ayer' }],
    ['consulted_at no string', { ...okBody, consulted_at: 123 }],
    ['rut ausente', { score: 73, consulted_at: okBody.consulted_at }],
    [
      'clave antigua fecha sin consulted_at',
      { rut: okBody.rut, score: 73, fecha: '2025-06-27T14:35:00Z' },
    ],
    ['rut vacío', { ...okBody, rut: '' }],
    ['cuerpo null', null],
    ['cuerpo arreglo', [okBody]],
  ])('200 con %s -> malformed', async (_nombre, body) => {
    const out = await clientWith(async () => json(body))('1-9');
    expect(out).toEqual({
      kind: 'error',
      reason: 'malformed',
      status: 200,
      messageKey: 'score.errors.serverError',
    });
  });

  it('200 con cuerpo no JSON -> malformed', async () => {
    const out = await clientWith(async () => new Response('<html>', { status: 200 }))('1-9');
    expect(out).toMatchObject({ kind: 'error', reason: 'malformed' });
  });

  it('no toca el almacenamiento del navegador', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await clientWith(async () => json(okBody))('1-9');
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    setItem.mockRestore();
  });
});
