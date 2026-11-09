import express from 'express';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { notFound } from './middlewares/not-found.middleware.js';
import { router } from './routes/index.js';

/** Construye la aplicación Express sin levantar el servidor (facilita las pruebas). */
export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api', router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
