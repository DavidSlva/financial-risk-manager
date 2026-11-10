import type { PermissionKey } from '../config/permissions.js';
import type { AuthorizationCheck } from '../models/authorization.types.js';
import { getDataStore, type DataStore } from './data-store.service.js';

/** `true` solo si existe la fila (role, key) con `value: true`. Sin fila o con `false`: denegado. */
export function hasPermission(
  role: string,
  key: PermissionKey,
  store: DataStore = getDataStore(),
): boolean {
  return store
    .load()
    .permissions.some(
      (permission) =>
        permission.role === role && permission.key === key && permission.value === true,
    );
}

/**
 * Callback para recursos triviales: solo exige un permiso. Los recursos con una regla propia
 * (p. ej. score) definen su callback en su propio service.
 */
export function requirePermission(
  key: PermissionKey,
  store: DataStore = getDataStore(),
): AuthorizationCheck {
  return ({ user }) => hasPermission(user.role, key, store);
}
