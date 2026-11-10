import type { Request, Response } from 'express';
import { HttpError } from '../config/http-errors.js';
import { isValidRut } from '../services/rut.service.js';
import type { DataStore } from '../services/data-store.service.js';
import { findScoreByRut } from '../services/scores.service.js';

export function createScoresController(deps: { store?: DataStore } = {}) {
  return {
    /** GET /:rut — llega aquí solo quien ya pasó `authenticate` y `authorize(canGetScore)`. */
    getScore(req: Request, res: Response): void {
      const rut = req.params.rut;
      // Se valida después de authenticate y authorize: quien no puede ver el rut recibe 403 igual.
      if (!isValidRut(rut)) throw new HttpError('BAD_REQUEST');
      const score = findScoreByRut(rut, deps.store);
      if (!score) throw new HttpError('NOT_FOUND');
      res.json({ rut: score.rut, score: score.score });
    },
  };
}
