import type { Request, Response } from 'express';
import { HttpError } from '../config/http-errors.js';
import { refreshAccess, type AuthDeps } from '../services/auth.service.js';

export function createAuthController(deps: AuthDeps = {}) {
  return {
    /** POST /refresh: cambia un refresh vigente por un access nuevo. */
    async refresh(req: Request, res: Response): Promise<void> {
      const body: unknown = req.body;
      const refreshToken =
        typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>).refreshToken
          : undefined;
      if (typeof refreshToken !== 'string' || refreshToken === '') {
        throw new HttpError('BAD_REQUEST');
      }
      res.json(await refreshAccess(refreshToken, deps));
    },
  };
}
