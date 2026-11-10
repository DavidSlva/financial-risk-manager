import { randomBytes } from 'node:crypto';
import { environment, type JwtConfig } from '../config/environment.js';
import { HttpError } from '../config/http-errors.js';
import type { AuthenticatedUser } from '../models/data.types.js';
import { getDataStore, type DataStore } from './data-store.service.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { generateTokens, verifyToken, type TokenPair, type TokenType } from './token.service.js';
import { findUserByRut, reserveLoginAttempt, resetLoginAttempts } from './users.service.js';

export interface AuthDeps {
  store?: DataStore;
  jwt?: JwtConfig;
  /** Intentos de login fallidos permitidos antes de bloquear (por defecto, el de la configuración). */
  loginMaxAttempts?: number;
}

/**
 * Validador: verifica el token (firma, expiración, tipo) y luego comprueba en `users.json` que
 * el usuario exista y esté vigente. Es lo que permite revocar: el token no cambia, el usuario sí.
 * Si los datos no son íntegros, `DataIntegrityError` se propaga (falla cerrado).
 */
async function validate(token: string, typ: TokenType, deps: AuthDeps): Promise<AuthenticatedUser> {
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
  // El hash y el contador de intentos no salen de la capa de datos.
  return { rut: user.rut, role: user.role, active: user.active };
}

/** Autentica un access token y devuelve el usuario vigente (con su rol actual). */
export function authenticateAccess(token: string, deps: AuthDeps = {}): Promise<AuthenticatedUser> {
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

// Hash señuelo: se verifica cuando no hay un hash real que usar (rut inexistente, no vigente o
// bloqueado) para que el login cueste lo mismo en todos los casos y no revele cuál ocurrió.
// Se calcula con los parámetros por defecto, igual que los hashes reales.
let decoyHash: Promise<string> | undefined;
function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword(randomBytes(16).toString('hex'));
  return decoyHash;
}

/**
 * Login (spec 009): verifica rut + contraseña y emite el primer par de tokens.
 * - Reserva un intento (incrementa el contador de forma atómica) **antes** de verificar, de modo
 *   que las peticiones concurrentes no eludan el límite. Un usuario bloqueado, no vigente o
 *   inexistente no pasa de ahí.
 * - Un login exitoso reinicia el contador.
 * - Todos los rechazos son el mismo `UNAUTHORIZED` y cuestan una verificación de hash.
 * - Si no se puede registrar el intento o los datos no son íntegros, el error se propaga (no se
 *   emiten tokens).
 */
export async function login(
  rut: string,
  password: string,
  deps: AuthDeps = {},
): Promise<TokenPair> {
  const jwt = deps.jwt ?? environment.jwt;
  const store = deps.store ?? getDataStore();
  const maxAttempts = deps.loginMaxAttempts ?? environment.loginMaxAttempts;

  const reserved = await reserveLoginAttempt(rut, maxAttempts, store);
  if (!reserved) {
    await verifyPassword(password, await getDecoyHash());
    throw new HttpError('UNAUTHORIZED');
  }

  const user = findUserByRut(rut, store);
  const hash = user?.password_hash ?? (await getDecoyHash());
  const valid = await verifyPassword(password, hash);
  if (!user || !valid) throw new HttpError('UNAUTHORIZED');

  await resetLoginAttempts(rut, store);
  return generateTokens(user, jwt);
}
