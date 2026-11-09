import type { NextFunction, Request, Response } from 'express';
import {
  HTTP_ERRORS,
  HttpError,
  httpErrorTypeFromStatus,
  type HttpErrorType,
} from '../config/http-errors.js';

function typeOf(err: unknown): HttpErrorType {
  if (err instanceof HttpError) return err.type;
  // Errores de librerías (p. ej. el 400 de un JSON malformado) traen `status`.
  const status = (err as { status?: unknown } | null)?.status;
  return httpErrorTypeFromStatus(status) ?? 'INTERNAL_SERVER_ERROR';
}

/**
 * Único manejador de errores. Traduce cualquier error usando el mapa de `config/http-errors`;
 * el cuerpo sale siempre del mapa, nunca del error original. Express lo identifica por su
 * firma de 4 argumentos.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const type = typeOf(err);
  const definition: { status: number; message: string; headers?: Record<string, string> } =
    HTTP_ERRORS[type];

  if (type === 'INTERNAL_SERVER_ERROR') console.error(err);

  if (definition.headers) res.set(definition.headers);
  res.status(definition.status).json({ error: definition.message });
}
