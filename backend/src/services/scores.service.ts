import { PERMISSIONS } from '../config/permissions.js';
import type { AuthorizationContext } from '../models/authorization.types.js';
import type { Score } from '../models/data.types.js';
import { getDataStore, type DataStore } from './data-store.service.js';
import { hasPermission } from './permissions.service.js';

export function findScoreByRut(
  rut: string,
  store: DataStore = getDataStore(),
): Readonly<Score> | undefined {
  return store.load().scores.find((score) => score.rut === rut);
}

/**
 * Callback de autorización del recurso score (spec 013), para `authorize(canGetScore)`.
 * Solo valida si el usuario puede acceder al score del rut solicitado:
 * - `can_get_all_score`: cualquier rut.
 * - `can_get_score`: únicamente el rut del propio usuario autenticado.
 * - En cualquier otro caso: denegado.
 * No consulta si el score existe: eso es un 404 posterior, solo para quien está autorizado.
 */
export function canGetScore(
  { user, params }: AuthorizationContext,
  store: DataStore = getDataStore(),
): boolean {
  if (hasPermission(user.role, PERMISSIONS.CAN_GET_ALL_SCORE, store)) return true;
  return (
    hasPermission(user.role, PERMISSIONS.CAN_GET_SCORE, store) &&
    params.rut !== undefined &&
    params.rut === user.rut
  );
}
