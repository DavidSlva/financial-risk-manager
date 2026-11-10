/**
 * Catálogo cerrado de permisos (spec 011). Cada permiso es una clave con significado propio;
 * la regla que decide el acceso a un recurso la define el service de ese recurso.
 * Agregar un permiso es agregar una entrada aquí (y, si corresponde, filas en permissions.json).
 */
export const PERMISSIONS = {
  /** Puede ver su propio score. */
  CAN_GET_SCORE: 'can_get_score',
  /** Puede ver el score de cualquier rut. */
  CAN_GET_ALL_SCORE: 'can_get_all_score',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const KEYS: readonly string[] = Object.values(PERMISSIONS);

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === 'string' && KEYS.includes(value);
}
