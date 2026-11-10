import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from '../config/http-errors.js';
import type { AuthorizationCheck } from '../models/authorization.types.js';

/**
 * Autorización: ejecuta el callback del recurso (definido en su service) y solo deja pasar si
 * devuelve exactamente `true`. Va después de `authenticate`. El callback es obligatorio: no existe
 * una autorización permisiva por omisión.
 */
export function authorize(check: AuthorizationCheck): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new HttpError('UNAUTHORIZED');

      const allowed = await check({
        user: req.user,
        params: req.params as Record<string, string>,
        query: req.query as Record<string, unknown>,
      });
      if (allowed !== true) throw new HttpError('FORBIDDEN');

      next();
    } catch (error) {
      next(error);
    }
  };
}
