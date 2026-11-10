import { isAbsolute, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/config/environment.js';
import { TEST_SECRET_HEX } from '../helpers/jwt-fixtures.js';

const base = { JWT_SECRET: TEST_SECRET_HEX };

describe('config/environment', () => {
  it('aplica valores por defecto', () => {
    expect(parseEnvironment(base)).toMatchObject({ nodeEnv: 'development', port: 3000 });
  });

  it('lee NODE_ENV y PORT', () => {
    expect(parseEnvironment({ ...base, NODE_ENV: 'production', PORT: '8080' })).toMatchObject({
      nodeEnv: 'production',
      port: 8080,
    });
  });

  it.each(['0', '65536', 'abc', '3.5', ''])('rechaza PORT inválido %j', (port) => {
    expect(() => parseEnvironment({ ...base, PORT: port })).toThrow(/PORT/);
  });

  it('rechaza NODE_ENV desconocido', () => {
    expect(() => parseEnvironment({ ...base, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('informa todos los errores a la vez', () => {
    expect(() => parseEnvironment({ ...base, NODE_ENV: 'x', PORT: 'y' })).toThrow(
      /NODE_ENV[\s\S]*PORT/,
    );
  });

  describe('DATA_DIR', () => {
    it('por defecto es la carpeta backend/data (ruta absoluta)', () => {
      const { dataDir } = parseEnvironment(base);

      expect(isAbsolute(dataDir)).toBe(true);
      expect(dataDir.replaceAll('\\', '/')).toMatch(/\/backend\/data$/);
    });

    it('configurable, resuelto a ruta absoluta', () => {
      expect(parseEnvironment({ ...base, DATA_DIR: 'otra/carpeta' }).dataDir).toBe(
        resolve('otra/carpeta'),
      );
    });

    it('rechaza DATA_DIR vacío', () => {
      expect(() => parseEnvironment({ ...base, DATA_DIR: '  ' })).toThrow(/DATA_DIR/);
    });
  });

  describe('JWT_SECRET', () => {
    it('es obligatoria', () => {
      expect(() => parseEnvironment({})).toThrow(/JWT_SECRET/);
    });

    it('se convierte en 64 bytes', () => {
      const { jwt } = parseEnvironment(base);

      expect(jwt.secret).toHaveLength(64);
      expect(Buffer.from(jwt.secret).toString('hex')).toBe(TEST_SECRET_HEX);
    });

    it.each([
      ['demasiado corta (32 bytes)', 'ab'.repeat(32)],
      ['demasiado larga (65 bytes)', 'ab'.repeat(65)],
      ['no hexadecimal', 'zz'.repeat(64)],
      ['vacía', ''],
    ])('rechaza una clave %s', (_label, secret) => {
      expect(() => parseEnvironment({ JWT_SECRET: secret })).toThrow(/JWT_SECRET/);
    });

    it('no revela la clave en el mensaje de error', () => {
      const secret = 'zz'.repeat(64);

      expect(() => parseEnvironment({ JWT_SECRET: secret })).toThrow(
        expect.objectContaining({ message: expect.not.stringContaining(secret) }),
      );
    });
  });

  describe('JWT_ALGORITHM', () => {
    it('por defecto es HS256', () => {
      expect(parseEnvironment(base).jwt.algorithm).toBe('HS256');
    });

    it.each(['HS256', 'HS384', 'HS512'])('acepta %s', (algorithm) => {
      expect(parseEnvironment({ ...base, JWT_ALGORITHM: algorithm }).jwt.algorithm).toBe(algorithm);
    });

    it.each(['none', 'RS256', 'ES256', 'hs256', ''])('rechaza %j', (algorithm) => {
      expect(() => parseEnvironment({ ...base, JWT_ALGORITHM: algorithm })).toThrow(
        /JWT_ALGORITHM/,
      );
    });
  });

  describe('LOGIN_MAX_ATTEMPTS', () => {
    it('por defecto es 5', () => {
      expect(parseEnvironment(base).loginMaxAttempts).toBe(5);
    });

    it('es configurable', () => {
      expect(parseEnvironment({ ...base, LOGIN_MAX_ATTEMPTS: '3' }).loginMaxAttempts).toBe(3);
    });

    it.each(['0', '-1', 'abc', '2.5', ''])('rechaza %j', (value) => {
      expect(() => parseEnvironment({ ...base, LOGIN_MAX_ATTEMPTS: value })).toThrow(
        /LOGIN_MAX_ATTEMPTS/,
      );
    });
  });

  describe('TTL', () => {
    it('por defecto: access 900 s y refresh 604800 s', () => {
      expect(parseEnvironment(base).jwt).toMatchObject({
        accessTtlSeconds: 900,
        refreshTtlSeconds: 604800,
      });
    });

    it('son configurables', () => {
      expect(
        parseEnvironment({
          ...base,
          ACCESS_TOKEN_TTL_SECONDS: '60',
          REFRESH_TOKEN_TTL_SECONDS: '3600',
        }).jwt,
      ).toMatchObject({ accessTtlSeconds: 60, refreshTtlSeconds: 3600 });
    });

    it.each(['0', '-5', 'abc', '1.5', ''])('rechaza ACCESS_TOKEN_TTL_SECONDS %j', (ttl) => {
      expect(() => parseEnvironment({ ...base, ACCESS_TOKEN_TTL_SECONDS: ttl })).toThrow(
        /ACCESS_TOKEN_TTL_SECONDS/,
      );
    });

    it.each(['0', '-5', 'abc', '1.5', ''])('rechaza REFRESH_TOKEN_TTL_SECONDS %j', (ttl) => {
      expect(() => parseEnvironment({ ...base, REFRESH_TOKEN_TTL_SECONDS: ttl })).toThrow(
        /REFRESH_TOKEN_TTL_SECONDS/,
      );
    });

    it.each(['900', '100'])('el refresh debe ser mayor que el access (refresh=%s)', (refresh) => {
      expect(() =>
        parseEnvironment({
          ...base,
          ACCESS_TOKEN_TTL_SECONDS: '900',
          REFRESH_TOKEN_TTL_SECONDS: refresh,
        }),
      ).toThrow(/mayor/);
    });
  });
});
