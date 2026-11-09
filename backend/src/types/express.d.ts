import type { User } from '../models/data.types.js';

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado por `authenticate.middleware`. */
      user?: Readonly<User>;
    }
  }
}
