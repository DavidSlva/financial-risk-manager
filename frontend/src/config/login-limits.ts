/** Límites de tamaño del login. rut = RUT normalizado; password en puntos de código Unicode. */
export const LOGIN_LIMITS = {
  rut: { min: 9, max: 10 },
  password: { min: 8, max: 128 },
} as const;
