const NODE_ENVS = ['development', 'test', 'production'] as const;

export type NodeEnv = (typeof NODE_ENVS)[number];

export interface Environment {
  nodeEnv: NodeEnv;
  port: number;
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

  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }

  return { nodeEnv: rawNodeEnv as NodeEnv, port };
}

export const environment: Environment = Object.freeze(parseEnvironment(process.env));
