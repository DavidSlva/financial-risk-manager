import type { Request, Response } from 'express';
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
        res.status(400).json({ error: 'Bad Request' });
        return;
      }
      res.json(await refreshAccess(refreshToken, deps));
    },
  };
}
