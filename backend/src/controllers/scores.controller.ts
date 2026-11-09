import type { Request, Response } from 'express';
import { HttpError } from '../config/http-errors.js';
import type { DataStore } from '../services/data-store.service.js';
import { findScoreByRut } from '../services/scores.service.js';

export function createScoresController(deps: { store?: DataStore } = {}) {
  return {
    /** GET /:rut — llega aquí solo quien ya pasó `authenticate` y `authorize(canGetScore)`. */
    getScore(req: Request, res: Response): void {
      const rut = req.params.rut as string;
      const score = findScoreByRut(rut, deps.store);
      if (!score) throw new HttpError('NOT_FOUND');
      res.json({ rut: score.rut, score: score.score });
    },
  };
}
