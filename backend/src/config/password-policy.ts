/**
 * Política de largo de la contraseña (spec 009): entre 8 y 128 caracteres (puntos de código
 * Unicode). Sin reglas de composición. El máximo acota el costo de calcular el hash.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
} as const;
