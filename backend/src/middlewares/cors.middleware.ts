import type { NextFunction, Request, RequestHandler, Response } from 'express';

const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';
const PREFLIGHT_MAX_AGE_SECONDS = '600';

/**
 * CORS con credenciales (spec 014), pensado para desarrollo (frontend en otro puerto). La sesión
 * viaja en cookies, así que:
 * - la lista de orígenes es explícita y la coincidencia exacta;
 * - **nunca** se responde `*` ni se refleja un origen que no esté en la lista;
 * - el preflight se responde aquí, antes del cuerpo y de las rutas.
 * Con la lista vacía (p. ej. producción, mismo dominio) no hace nada.
 */
export function createCors(origins: readonly string[]): RequestHandler {
  if (origins.length === 0) return (_req: Request, _res: Response, next: NextFunction) => next();

  const allowedOrigins = new Set(origins);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Las cachés no deben mezclar respuestas de orígenes distintos.
    res.vary('Origin');

    const origin = req.headers.origin;
    const allowed = origin !== undefined && allowedOrigins.has(origin);
    if (allowed) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Credentials', 'true');
    }

    const isPreflight =
      req.method === 'OPTIONS' &&
      origin !== undefined &&
      req.headers['access-control-request-method'] !== undefined;
    if (isPreflight) {
      if (allowed) {
        res.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
        res.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
        res.set('Access-Control-Max-Age', PREFLIGHT_MAX_AGE_SECONDS);
      }
      res.status(204).end();
      return;
    }

    next();
  };
}
