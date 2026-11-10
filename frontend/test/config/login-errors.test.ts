import { describe, expect, it } from 'vitest';
import { LOGIN_ERROR_KEYS, reasonForStatus } from '../../src/config/login-errors.js';
import es from '../../src/i18n/es.json';

function lookup(path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], es);
}

describe('LOGIN_ERROR_KEYS', () => {
  it('mapea cada razón a su llave', () => {
    expect(LOGIN_ERROR_KEYS).toEqual({
      'bad-request': 'login.errors.badRequest',
      unauthorized: 'login.errors.invalidCredentials',
      'too-many-requests': 'login.errors.tooManyRequests',
      'client-error': 'login.errors.clientError',
      'server-error': 'login.errors.serverError',
      malformed: 'login.errors.serverError',
      network: 'login.errors.network',
    });
  });

  it('cada llave existe en es.json', () => {
    for (const key of Object.values(LOGIN_ERROR_KEYS)) {
      expect(typeof lookup(key)).toBe('string');
    }
  });
});

describe('reasonForStatus', () => {
  it.each([
    [400, 'bad-request'],
    [401, 'unauthorized'],
    [429, 'too-many-requests'],
    [403, 'client-error'],
    [404, 'client-error'],
    [418, 'client-error'],
    [500, 'server-error'],
    [503, 'server-error'],
  ])('status %i -> %s', (status, reason) => {
    expect(reasonForStatus(status)).toBe(reason);
  });
});
