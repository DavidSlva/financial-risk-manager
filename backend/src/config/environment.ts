import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE_ENVS = ['development', 'test', 'production'] as const;

/** backend/data: desde src/config (o dist/config) se sube dos niveles. */
const DEFAULT_DATA_DIR = fileURLToPath(new URL('../../data', import.meta.url));

export type NodeEnv = (typeof NODE_ENVS)[number];

export interface Environment {
  nodeEnv: NodeEnv;
  port: number;
  /** Carpeta con roles.json, users.json y scores.json (ruta absoluta). */
  dataDir: string;
}

/**
 * Valida y tipa las variables de entorno. Acumula todos los errores y falla una sola vez.
 * Recibe el origen como parámetro para poder probarse sin tocar `process.env`.
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

  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }

  return { nodeEnv: rawNodeEnv as NodeEnv, port, dataDir };
}

export const environment: Environment = Object.freeze(parseEnvironment(process.env));
