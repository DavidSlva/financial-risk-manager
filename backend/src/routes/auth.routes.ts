import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import type { AuthControllerDeps } from '../controllers/auth.controller.js';

export function createAuthRouter(deps: AuthControllerDeps = {}): Router {
  const router = Router();
  const controller = createAuthController(deps);

  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);

  return router;
}

export const authRouter = createAuthRouter();
