import type { CookieOptions } from 'express';

/** Nombres de las cookies de sesión (spec 009). */
export const COOKIE_NAMES = {
  access: 'access_token',
  refresh: 'refresh_token',
} as const;

/**
 * Opciones de las cookies de sesión: `HttpOnly` (el JavaScript del frontend no las lee) y
 * `SameSite=Strict` (mismo dominio). `Secure` solo en producción (en desarrollo se usa
 * `http://localhost`). El refresh solo viaja a las rutas de autenticación. Sin `Domain`:
 * la cookie queda ligada al host que la emitió.
 */
export function cookieOptions(
  kind: keyof typeof COOKIE_NAMES,
  maxAgeSeconds: number,
  secure: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: kind === 'access' ? '/' : '/api/auth',
    maxAge: maxAgeSeconds * 1000,
  };
}
