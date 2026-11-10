import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { PASSWORD_POLICY } from '../config/password-policy.js';

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

/** Parámetros por defecto (spec 009): N=2^15, r=8, p=3 (opción recomendada por OWASP). */
export const DEFAULT_SCRYPT_PARAMS: Readonly<ScryptParams> = { N: 32768, r: 8, p: 3 };

const SALT_BYTES = 16;
const KEY_BYTES = 32;
const MAX_MEMORY = 128 * 1024 * 1024;

// Límites de los parámetros leídos de un hash: evitan que un valor absurdo en los datos
// provoque un consumo desmedido de memoria o CPU.
const MIN_N = 2 ** 10;
const MAX_N = 2 ** 20;
const MAX_R = 32;
const MAX_P = 16;

// scrypt$N$r$p$<sal base64>$<hash base64>
const HASH_FORMAT = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([A-Za-z0-9+/]+={0,2})\$([A-Za-z0-9+/]+={0,2})$/;

/** Largo de la contraseña en puntos de código Unicode, sin recortar ni normalizar. */
export function isValidPassword(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const length = Array.from(value).length;
  return length >= PASSWORD_POLICY.minLength && length <= PASSWORD_POLICY.maxLength;
}

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  { N, r, p }: ScryptParams,
): Promise<Buffer> {
  const options: ScryptOptions = { N, r, p, maxmem: MAX_MEMORY };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

interface ParsedHash {
  params: ScryptParams;
  salt: Buffer;
  key: Buffer;
}

function parseHash(value: unknown): ParsedHash | undefined {
  if (typeof value !== 'string') return undefined;
  const match = HASH_FORMAT.exec(value);
  if (!match) return undefined;

  const [, n, r, p, salt, key] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  const validN = Number.isInteger(params.N) && params.N >= MIN_N && params.N <= MAX_N;
  if (!validN || (params.N & (params.N - 1)) !== 0) return undefined;
  if (params.r < 1 || params.r > MAX_R || params.p < 1 || params.p > MAX_P) return undefined;

  const saltBuffer = Buffer.from(salt, 'base64');
  const keyBuffer = Buffer.from(key, 'base64');
  if (saltBuffer.length === 0 || keyBuffer.length === 0) return undefined;
  return { params, salt: saltBuffer, key: keyBuffer };
}

/** `true` si el valor tiene el formato `scrypt$N$r$p$sal$hash` con parámetros razonables. */
export function isPasswordHash(value: unknown): value is string {
  return parseHash(value) !== undefined;
}

/** Hash de una contraseña con scrypt y sal aleatoria: `scrypt$N$r$p$sal$hash` (base64). */
export async function hashPassword(
  password: string,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, KEY_BYTES, params);
  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * Verifica una contraseña contra su hash con comparación en tiempo constante. Usa los parámetros
 * guardados en el hash. Un hash mal formado verifica como `false`.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parsed = parseHash(hash);
  if (!parsed) return false;
  const key = await deriveKey(password, parsed.salt, parsed.key.length, parsed.params);
  return key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
}
