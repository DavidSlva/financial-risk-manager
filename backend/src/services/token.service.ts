import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { environment, type JwtConfig } from '../config/environment.js';
import type { User } from '../models/data.types.js';

export type TokenType = 'access' | 'refresh';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Vida del access en segundos. */
  accessExpiresIn: number;
  /** Vida del refresh en segundos. */
  refreshExpiresIn: number;
}

export interface VerifiedToken {
  sub: string;
  jti: string;
  typ: TokenType;
}

/** Cualquier fallo de verificación; el mensaje es genérico a propósito. */
export class InvalidTokenError extends Error {
  constructor() {
    super('Token inválido');
    this.name = 'InvalidTokenError';
  }
}

async function sign(
  rut: string,
  typ: TokenType,
  ttlSeconds: number,
  config: JwtConfig,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ typ })
    .setProtectedHeader({ alg: config.algorithm })
    .setSubject(rut)
    .setJti(randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(config.secret);
}

/** Genera el par access + refresh de un usuario. No consulta datos: solo firma. */
export async function generateTokens(
  user: Pick<User, 'rut'>,
  config: JwtConfig = environment.jwt,
): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    sign(user.rut, 'access', config.accessTtlSeconds, config),
    sign(user.rut, 'refresh', config.refreshTtlSeconds, config),
  ]);
  return {
    accessToken,
    refreshToken,
    accessExpiresIn: config.accessTtlSeconds,
    refreshExpiresIn: config.refreshTtlSeconds,
  };
}

/**
 * Verifica firma (solo con el algoritmo configurado), expiración, claims obligatorios y que el
 * tipo sea el esperado. No consulta la vigencia del usuario: eso lo hace `auth.service`.
 */
export async function verifyToken(
  token: string,
  expected: TokenType,
  config: JwtConfig = environment.jwt,
): Promise<VerifiedToken> {
  try {
    const { payload } = await jwtVerify(token, config.secret, {
      algorithms: [config.algorithm],
      requiredClaims: ['sub', 'jti', 'iat', 'exp'],
    });
    if (payload.typ !== expected || !payload.sub || !payload.jti) throw new InvalidTokenError();
    return { sub: payload.sub, jti: payload.jti, typ: expected };
  } catch {
    throw new InvalidTokenError();
  }
}
