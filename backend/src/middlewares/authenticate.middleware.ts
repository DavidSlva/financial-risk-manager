import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { COOKIE_NAMES } from '../config/cookies.js';
import { HttpError } from '../config/http-errors.js';
import { authenticateAccess, type AuthDeps } from '../services/auth.service.js';
import { parseCookies } from '../services/cookie.service.js';

const BEARER = /^Bearer ([^\s]+)$/;

/**
 * Access token de la petición (spec 009): la cookie `access_token` o, como alternativa para
 * clientes que no son un navegador, `Authorization: Bearer`. Si hay cookie vale **solo la cookie**
 * (aunque esté vacía o sea inválida): no se mezclan los dos canales.
 */
function accessTokenOf(req: Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  if (COOKIE_NAMES.access in cookies) return cookies[COOKIE_NAMES.access];
  return BEARER.exec(req.headers.authorization ?? '')?.[1];
}

/**
 * Autentica con el access token. Solo el access autentica (el refresh no).
 * Deja el usuario vigente en `req.user`. Los rechazos los traduce `error-handler` a 401.
 */
export function createAuthenticate(deps: AuthDeps = {}): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = accessTokenOf(req);
      if (!token) throw new HttpError('UNAUTHORIZED');
      req.user = await authenticateAccess(token, deps);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authenticate = createAuthenticate();
