import type { User } from './data.types.js';

/**
 * Contexto plano que `authorize.middleware` entrega al callback de autorización.
 * No incluye tipos de Express: el callback vive en el service del recurso.
 */
export interface AuthorizationContext {
  user: Readonly<User>;
  params: Readonly<Record<string, string>>;
  query: Readonly<Record<string, unknown>>;
}

/** Callback definido en el service de un recurso: `true` solo si el usuario puede acceder. */
export type AuthorizationCheck = (context: AuthorizationContext) => boolean | Promise<boolean>;
