import type { NextFunction, Request, Response } from 'express';

/** Manejador de errores: Express lo identifica por su firma de 4 argumentos. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
}
