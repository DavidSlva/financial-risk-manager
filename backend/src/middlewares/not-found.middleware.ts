import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../config/http-errors.js';

/** Ruta inexistente: delega un NOT_FOUND al manejador de errores. */
export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError('NOT_FOUND'));
}
