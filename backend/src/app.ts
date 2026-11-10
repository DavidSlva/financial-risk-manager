import express from 'express';
import { environment } from './config/environment.js';
import { createCors } from './middlewares/cors.middleware.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { notFound } from './middlewares/not-found.middleware.js';
import { router } from './routes/index.js';

/** Construye la aplicación Express sin levantar el servidor (facilita las pruebas). */
export function createApp(options: { corsOrigins?: readonly string[] } = {}): express.Express {
  const app = express();

  app.disable('x-powered-by');
  // CORS primero: el preflight se responde antes del cuerpo y de las rutas (spec 014).
  app.use(createCors(options.corsOrigins ?? environment.corsOrigins));
  app.use(express.json());

  app.use('/api', router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
