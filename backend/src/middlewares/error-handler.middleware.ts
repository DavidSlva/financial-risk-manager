import type { NextFunction, Request, Response } from 'express';
import { AuthenticationError } from '../services/auth.service.js';

/** Manejador de errores: Express lo identifica por su firma de 4 argumentos. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AuthenticationError) {
    res.set('WWW-Authenticate', 'Bearer').status(401).json({ error: 'Unauthorized' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
}
