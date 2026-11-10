import { Router } from 'express';
import { createScoresController } from '../controllers/scores.controller.js';
import { createAuthenticate } from '../middlewares/authenticate.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import type { AuthDeps } from '../services/auth.service.js';
import { canGetScore } from '../services/scores.service.js';

export function createScoresRouter(deps: AuthDeps & { now?: () => Date } = {}): Router {
  const router = Router();
  const controller = createScoresController(deps);

  // authenticate → authorize (callback del service del recurso) → controlador
  router.get(
    '/:rut',
    createAuthenticate(deps),
    authorize((context) => canGetScore(context, deps.store)),
    controller.getScore,
  );

  return router;
}

export const scoresRouter = createScoresRouter();
