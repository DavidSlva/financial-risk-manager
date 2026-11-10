import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import type { AuthDeps } from '../services/auth.service.js';

export function createAuthRouter(deps: AuthDeps = {}): Router {
  const router = Router();
  const controller = createAuthController(deps);

  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);

  return router;
}

export const authRouter = createAuthRouter();
