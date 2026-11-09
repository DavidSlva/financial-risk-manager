import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE_ENVS = ['development', 'test', 'production'] as const;

/** Solo algoritmos simétricos (HMAC): la clave es compartida. */
const JWT_ALGORITHMS = ['HS256', 'HS384', 'HS512'] as const;

/** backend/data: desde src/config (o dist/config) se sube dos niveles. */
const DEFAULT_DATA_DIR = fileURLToPath(new URL('../../data', import.meta.url));

const JWT_SECRET_BYTES = 64;
const DEFAULT_ACCESS_TTL_SECONDS = 900;
const DEFAULT_REFRESH_TTL_SECONDS = 604800;

export type NodeEnv = (typeof NODE_ENVS)[number];
export type JwtAlgorithm = (typeof JWT_ALGORITHMS)[number];

export interface JwtConfig {
  /** Clave simétrica de 64 bytes. */
  secret: Uint8Array;
  algorithm: JwtAlgorithm;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

export interface Environment {
  nodeEnv: NodeEnv;
  port: number;
  /** Carpeta con roles.json, users.json y scores.json (ruta absoluta). */
  dataDir: string;
  jwt: JwtConfig;
}

function parsePositiveInteger(
  name: string,
  raw: string | undefined,
  fallback: number,
  errors: string[],
): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(value) || value <= 0) {
    errors.push(`${name} debe ser un entero positivo (recibido: "${raw}")`);
    return fallback;
  }
  return value;
}

/**
 * Valida y tipa las variables de entorno. Acumula todos los errores y falla una sola vez.
 * Recibe el origen como parámetro para poder probarse sin tocar `process.env`.
 * Nunca incluye el valor de `JWT_SECRET` en los mensajes de error.
 */
export function parseEnvironment(source: NodeJS.ProcessEnv): Environment {
  const errors: string[] = [];

  const rawNodeEnv = source.NODE_ENV ?? 'development';
  if (!NODE_ENVS.includes(rawNodeEnv as NodeEnv)) {
    errors.push(`NODE_ENV debe ser uno de: ${NODE_ENVS.join(', ')} (recibido: "${rawNodeEnv}")`);
  }

  const rawPort = source.PORT ?? '3000';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`PORT debe ser un entero entre 1 y 65535 (recibido: "${rawPort}")`);
  }

  const rawDataDir = source.DATA_DIR;
  if (rawDataDir !== undefined && rawDataDir.trim() === '') {
    errors.push('DATA_DIR no puede estar vacío');
  }
  const dataDir = rawDataDir === undefined ? DEFAULT_DATA_DIR : resolve(rawDataDir);

  const rawSecret = source.JWT_SECRET;
  let secret: Uint8Array = new Uint8Array(0);
  if (rawSecret === undefined) {
    errors.push('JWT_SECRET es obligatoria');
  } else if (!new RegExp(`^[0-9a-fA-F]{${JWT_SECRET_BYTES * 2}}$`).test(rawSecret)) {
    errors.push(
      `JWT_SECRET debe ser ${JWT_SECRET_BYTES} bytes en hexadecimal (${JWT_SECRET_BYTES * 2} caracteres)`,
    );
  } else {
    secret = Buffer.from(rawSecret, 'hex');
  }

  const rawAlgorithm = source.JWT_ALGORITHM ?? 'HS256';
  if (!JWT_ALGORITHMS.includes(rawAlgorithm as JwtAlgorithm)) {
    errors.push(
      `JWT_ALGORITHM debe ser uno de: ${JWT_ALGORITHMS.join(', ')} (recibido: "${rawAlgorithm}")`,
    );
  }

  const accessTtlSeconds = parsePositiveInteger(
    'ACCESS_TOKEN_TTL_SECONDS',
    source.ACCESS_TOKEN_TTL_SECONDS,
    DEFAULT_ACCESS_TTL_SECONDS,
    errors,
  );
  const refreshTtlSeconds = parsePositiveInteger(
    'REFRESH_TOKEN_TTL_SECONDS',
    source.REFRESH_TOKEN_TTL_SECONDS,
    DEFAULT_REFRESH_TTL_SECONDS,
    errors,
  );
  if (errors.length === 0 && refreshTtlSeconds <= accessTtlSeconds) {
    errors.push('REFRESH_TOKEN_TTL_SECONDS debe ser mayor que ACCESS_TOKEN_TTL_SECONDS');
  }

  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }

  return {
    nodeEnv: rawNodeEnv as NodeEnv,
    port,
    dataDir,
    jwt: {
      secret,
      algorithm: rawAlgorithm as JwtAlgorithm,
      accessTtlSeconds,
      refreshTtlSeconds,
    },
  };
}

export const environment: Environment = Object.freeze(parseEnvironment(process.env));
