import { SignJWT, decodeJwt, decodeProtectedHeader } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  InvalidTokenError,
  generateTokens,
  verifyToken,
} from '../../src/services/token.service.js';
import { testJwtConfig } from '../helpers/jwt-fixtures.js';

const user = { rut: '11111111-1' };
const config = testJwtConfig();

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('token.service', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateTokens', () => {
    it('devuelve un access y un refresh distintos', async () => {
      const pair = await generateTokens(user, config);

      expect(pair.accessToken).not.toBe(pair.refreshToken);
      expect(pair.accessExpiresIn).toBe(900);
      expect(pair.refreshExpiresIn).toBe(604800);
    });

    it('el access lleva sub, typ=access, jti y la vida del TTL de access', async () => {
      const { accessToken } = await generateTokens(user, config);
      const payload = decodeJwt(accessToken);

      expect(payload.sub).toBe('11111111-1');
      expect(payload.typ).toBe('access');
      expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
      expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(900);
    });

    it('el refresh lleva typ=refresh y la vida del TTL de refresh', async () => {
      const { refreshToken } = await generateTokens(user, config);
      const payload = decodeJwt(refreshToken);

      expect(payload.typ).toBe('refresh');
      expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(604800);
    });

    it('cada token tiene su propio jti', async () => {
      const { accessToken, refreshToken } = await generateTokens(user, config);

      expect(decodeJwt(accessToken).jti).not.toBe(decodeJwt(refreshToken).jti);
    });

    it('no incluye el rol en el token', async () => {
      const { accessToken } = await generateTokens({ rut: '1-9', role: 'admin' } as never, config);

      expect(decodeJwt(accessToken)).not.toHaveProperty('role');
    });

    it.each(['HS256', 'HS384', 'HS512'] as const)(
      'firma con el algoritmo configurado %s',
      async (algorithm) => {
        const { accessToken } = await generateTokens(user, testJwtConfig({ algorithm }));

        expect(decodeProtectedHeader(accessToken).alg).toBe(algorithm);
      },
    );

    it('respeta los TTL configurados', async () => {
      const short = testJwtConfig({ accessTtlSeconds: 30, refreshTtlSeconds: 60 });
      const pair = await generateTokens(user, short);

      expect(pair.accessExpiresIn).toBe(30);
      expect((decodeJwt(pair.accessToken).exp ?? 0) - (decodeJwt(pair.accessToken).iat ?? 0)).toBe(
        30,
      );
    });
  });

  describe('verifyToken', () => {
    it('acepta un access para typ=access', async () => {
      const { accessToken } = await generateTokens(user, config);

      expect(await verifyToken(accessToken, 'access', config)).toMatchObject({
        sub: '11111111-1',
        typ: 'access',
      });
    });

    it('acepta un refresh para typ=refresh', async () => {
      const { refreshToken } = await generateTokens(user, config);

      expect(await verifyToken(refreshToken, 'refresh', config)).toMatchObject({
        sub: '11111111-1',
        typ: 'refresh',
      });
    });

    it('el refresh no sirve como access', async () => {
      const { refreshToken } = await generateTokens(user, config);

      await expect(verifyToken(refreshToken, 'access', config)).rejects.toThrow(InvalidTokenError);
    });

    it('el access no sirve como refresh', async () => {
      const { accessToken } = await generateTokens(user, config);

      await expect(verifyToken(accessToken, 'refresh', config)).rejects.toThrow(InvalidTokenError);
    });

    it('rechaza un token expirado', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const { accessToken } = await generateTokens(user, config);

      vi.setSystemTime(new Date('2026-01-01T00:15:01Z'));

      await expect(verifyToken(accessToken, 'access', config)).rejects.toThrow(InvalidTokenError);
    });

    it('acepta el token justo antes de expirar', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const { accessToken } = await generateTokens(user, config);

      vi.setSystemTime(new Date('2026-01-01T00:14:59Z'));

      await expect(verifyToken(accessToken, 'access', config)).resolves.toBeDefined();
    });

    it('rechaza una firma alterada', async () => {
      const { accessToken } = await generateTokens(user, config);
      const tampered = `${accessToken.slice(0, -2)}${accessToken.endsWith('AA') ? 'BB' : 'AA'}`;

      await expect(verifyToken(tampered, 'access', config)).rejects.toThrow(InvalidTokenError);
    });

    it('rechaza un payload alterado', async () => {
      const { accessToken } = await generateTokens(user, config);
      const [header, , signature] = accessToken.split('.');
      const forged = `${header}.${base64url({ sub: '22222222-2', typ: 'access', jti: 'x', iat: 1, exp: 9999999999 })}.${signature}`;

      await expect(verifyToken(forged, 'access', config)).rejects.toThrow(InvalidTokenError);
    });

    it('rechaza un token firmado con otra clave', async () => {
      const { accessToken } = await generateTokens(user, config);
      const other = testJwtConfig({ secret: Buffer.alloc(64, 7) });

      await expect(verifyToken(accessToken, 'access', other)).rejects.toThrow(InvalidTokenError);
    });

    it('rechaza un token firmado con un algoritmo distinto al configurado', async () => {
      const { accessToken } = await generateTokens(user, testJwtConfig({ algorithm: 'HS512' }));

      await expect(
        verifyToken(accessToken, 'access', testJwtConfig({ algorithm: 'HS256' })),
      ).rejects.toThrow(InvalidTokenError);
    });

    it('rechaza alg=none', async () => {
      const now = Math.floor(Date.now() / 1000);
      const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: '11111111-1', typ: 'access', jti: 'x', iat: now, exp: now + 900 })}.`;

      await expect(verifyToken(unsigned, 'access', config)).rejects.toThrow(InvalidTokenError);
    });

    it.each(['', 'abc', 'a.b.c', 'a.b'])('rechaza basura %j', async (garbage) => {
      await expect(verifyToken(garbage, 'access', config)).rejects.toThrow(InvalidTokenError);
    });

    it.each(['sub', 'jti', 'exp'] as const)('rechaza un token sin %s', async (missing) => {
      const now = Math.floor(Date.now() / 1000);
      const jwt = new SignJWT({ typ: 'access' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now);
      if (missing !== 'sub') jwt.setSubject('11111111-1');
      if (missing !== 'jti') jwt.setJti('abc');
      if (missing !== 'exp') jwt.setExpirationTime(now + 900);
      const token = await jwt.sign(config.secret);

      await expect(verifyToken(token, 'access', config)).rejects.toThrow(InvalidTokenError);
    });

    it('el mensaje de error es genérico', async () => {
      const error = await verifyToken('abc', 'access', config).catch((e: unknown) => e);

      expect((error as Error).message).toBe('Token inválido');
    });
  });
});
