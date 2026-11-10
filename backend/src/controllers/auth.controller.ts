import type { Request, Response } from 'express';
import { HttpError } from '../config/http-errors.js';
import { login, refreshAccess, type AuthDeps } from '../services/auth.service.js';
import { isValidPassword } from '../services/password.service.js';
import { isValidRut } from '../services/rut.service.js';

const LOGIN_FIELDS = ['rut', 'password'];

/**
 * Valida el contrato de entrada del login (spec 009) **antes** de tocar los datos:
 * un objeto con exactamente `rut` (formato canónico, spec 008) y `password` (8 a 128 caracteres).
 */
function parseLoginBody(body: unknown): { rut: string; password: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError('BAD_REQUEST');
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => !LOGIN_FIELDS.includes(key))) {
    throw new HttpError('BAD_REQUEST');
  }
  const { rut, password } = record;
  if (!isValidRut(rut) || !isValidPassword(password)) throw new HttpError('BAD_REQUEST');
  return { rut, password };
}

export function createAuthController(deps: AuthDeps = {}) {
  return {
    /** POST /login: verifica rut + contraseña y emite el primer par de tokens. */
    async login(req: Request, res: Response): Promise<void> {
      const { rut, password } = parseLoginBody(req.body);
      const pair = await login(rut, password, deps);

      res.set('Cache-Control', 'no-store').json({
        accessToken: pair.accessToken,
        expiresIn: pair.accessExpiresIn,
        refreshToken: pair.refreshToken,
        refreshExpiresIn: pair.refreshExpiresIn,
      });
    },

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
