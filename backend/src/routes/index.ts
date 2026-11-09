import { Router } from 'express';
import { healthRouter } from './health.routes.js';

/** Enrutador principal: une los enrutadores de cada recurso. */
export const router = Router();

router.use('/health', healthRouter);
