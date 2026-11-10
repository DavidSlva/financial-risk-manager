/**
 * Normaliza un RUT chileno al formato canónico "12345678-5" (sin puntos, con guion, K mayúscula).
 * Recorta los espacios al inicio y al final. Devuelve null si el formato o el dígito verificador (módulo 11) no son válidos.
 */
export function normalizeRut(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length > 20) return null;
  const match = /^(\d{1,8})-?([\dkK])$/.exec(trimmed.replace(/\./g, ''));
  if (!match) return null;
  const body = match[1] as string;
  const dv = (match[2] as string).toUpperCase();

  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return dv === expected ? `${body}-${dv}` : null;
}
