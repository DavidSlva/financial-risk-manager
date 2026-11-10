import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { scoresRouter } from './scores.routes.js';

/** Enrutador principal: une los enrutadores de cada recurso. */
export const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
// Excepción a la convención de recursos en plural: designa el score único de un rut.
router.use('/score', scoresRouter);
