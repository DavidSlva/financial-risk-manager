import { environment, type JwtConfig } from '../config/environment.js';
import { HttpError } from '../config/http-errors.js';
import type { User } from '../models/data.types.js';
import { getDataStore, type DataStore } from './data-store.service.js';
import { generateTokens, verifyToken, type TokenType } from './token.service.js';
import { findUserByRut } from './users.service.js';

export interface AuthDeps {
  store?: DataStore;
  jwt?: JwtConfig;
}

/**
 * Validador: verifica el token (firma, expiración, tipo) y luego comprueba en `users.json` que
 * el usuario exista y esté vigente. Es lo que permite revocar: el token no cambia, el usuario sí.
 * Si los datos no son íntegros, `DataIntegrityError` se propaga (falla cerrado).
 */
async function validate(token: string, typ: TokenType, deps: AuthDeps): Promise<User> {
  const jwt = deps.jwt ?? environment.jwt;
  const store = deps.store ?? getDataStore();

  let sub: string;
  try {
    ({ sub } = await verifyToken(token, typ, jwt));
  } catch {
    throw new HttpError('UNAUTHORIZED');
  }

  const user = findUserByRut(sub, store);
  if (!user?.active) throw new HttpError('UNAUTHORIZED');
  return { ...user };
}

/** Autentica un access token y devuelve el usuario vigente (con su rol actual). */
export function authenticateAccess(token: string, deps: AuthDeps = {}): Promise<User> {
  return validate(token, 'access', deps);
}

/** Genera un access nuevo a partir de un refresh token. No rota el refresh. */
export async function refreshAccess(
  token: string,
  deps: AuthDeps = {},
): Promise<{ accessToken: string; expiresIn: number }> {
  const user = await validate(token, 'refresh', deps);
  const { accessToken, accessExpiresIn } = await generateTokens(user, deps.jwt ?? environment.jwt);
  return { accessToken, expiresIn: accessExpiresIn };
}
