import type { Request, Response } from 'express';
import { COOKIE_NAMES, cookieOptions } from '../config/cookies.js';
import { environment } from '../config/environment.js';
import { HttpError } from '../config/http-errors.js';
import { login, refreshAccess, type AuthDeps } from '../services/auth.service.js';
import { parseCookies } from '../services/cookie.service.js';
import { isValidPassword } from '../services/password.service.js';
import { isValidRut } from '../services/rut.service.js';

const LOGIN_FIELDS = ['rut', 'password'];

export interface AuthControllerDeps extends AuthDeps {
  /** Atributo `Secure` de las cookies (por defecto, solo con `NODE_ENV=production`). */
  secureCookies?: boolean;
}

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

export function createAuthController(deps: AuthControllerDeps = {}) {
  const secure = deps.secureCookies ?? environment.nodeEnv === 'production';

  return {
    /**
     * POST /login: verifica rut + contraseña y entrega el primer par de tokens **solo en cookies**
     * `HttpOnly` (`access_token` y `refresh_token`); el cuerpo no incluye los tokens.
     */
    async login(req: Request, res: Response): Promise<void> {
      const { rut, password } = parseLoginBody(req.body);
      const pair = await login(rut, password, deps);

      res
        .cookie(
          COOKIE_NAMES.access,
          pair.accessToken,
          cookieOptions('access', pair.accessExpiresIn, secure),
        )
        .cookie(
          COOKIE_NAMES.refresh,
          pair.refreshToken,
          cookieOptions('refresh', pair.refreshExpiresIn, secure),
        )
        .set('Cache-Control', 'no-store')
        .json({ expiresIn: pair.accessExpiresIn, refreshExpiresIn: pair.refreshExpiresIn });
    },

    /**
     * POST /refresh (sin cuerpo): lee el refresh de la cookie `refresh_token` y entrega un access
     * nuevo en la cookie `access_token`. No rota el refresh.
     */
    async refresh(req: Request, res: Response): Promise<void> {
      const token = parseCookies(req.headers.cookie)[COOKIE_NAMES.refresh];
      if (!token) throw new HttpError('UNAUTHORIZED');

      const { accessToken, expiresIn } = await refreshAccess(token, deps);

      res
        .cookie(COOKIE_NAMES.access, accessToken, cookieOptions('access', expiresIn, secure))
        .set('Cache-Control', 'no-store')
        .json({ expiresIn });
    },
  };
}
