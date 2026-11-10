import { describe, expect, it } from 'vitest';
import { COOKIE_NAMES, cookieOptions } from '../../src/config/cookies.js';

describe('config/cookies', () => {
  it('los nombres son access_token y refresh_token', () => {
    expect(COOKIE_NAMES).toEqual({ access: 'access_token', refresh: 'refresh_token' });
  });

  it('access: HttpOnly, SameSite=Strict, Path=/, maxAge en milisegundos', () => {
    expect(cookieOptions('access', 900, false)).toEqual({
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      path: '/',
      maxAge: 900_000,
    });
  });

  it('refresh: Path=/api/auth', () => {
    expect(cookieOptions('refresh', 604800, false)).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 604_800_000,
    });
  });

  it('secure se propaga', () => {
    expect(cookieOptions('access', 900, true).secure).toBe(true);
    expect(cookieOptions('refresh', 900, true).secure).toBe(true);
  });

  it.each(['access', 'refresh'] as const)(
    '%s no define Domain (solo el host que la emitió)',
    (kind) => {
      expect(cookieOptions(kind, 900, true)).not.toHaveProperty('domain');
    },
  );

  it.each(['access', 'refresh'] as const)('%s siempre es HttpOnly y Strict', (kind) => {
    const options = cookieOptions(kind, 60, false);

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('strict');
  });
});
