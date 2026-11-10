/**
 * Formato canónico del RUT (spec 008): `12345678-5`.
 * 7 u 8 dígitos sin ceros a la izquierda, un guion y un dígito verificador (0-9 o K mayúscula).
 */
const FORMAT = /^[1-9]\d{6,7}-[\dK]$/;

/** Dígito verificador por módulo 11 (serie 2..7, de derecha a izquierda). */
function checkDigit(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/**
 * `true` solo para un string en formato canónico con dígito verificador correcto.
 * Función pura: no recorta, no convierte ni normaliza la entrada.
 */
export function isValidRut(value: unknown): value is string {
  if (typeof value !== 'string' || !FORMAT.test(value)) return false;
  const [body, verifier] = value.split('-') as [string, string];
  return checkDigit(body) === verifier;
}
