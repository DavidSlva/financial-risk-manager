import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  AuthenticationError,
  authenticateAccess,
  type AuthDeps,
} from '../services/auth.service.js';

const BEARER = /^Bearer ([^\s]+)$/;

/**
 * Autentica con `Authorization: Bearer <access>`. Solo el access autentica (el refresh no).
 * Deja el usuario vigente en `req.user`. Los rechazos los traduce `error-handler` a 401.
 */
export function createAuthenticate(deps: AuthDeps = {}): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
      if (!token) throw new AuthenticationError();
      req.user = await authenticateAccess(token, deps);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authenticate = createAuthenticate();
