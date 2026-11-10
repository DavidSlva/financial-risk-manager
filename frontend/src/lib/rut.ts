const MAX_RAW_LENGTH = 20;

export function normalizeRut(raw: string): string | null {
  if (raw.length > MAX_RAW_LENGTH) return null;
  const compact = raw.replace(/[.-]/g, '').toUpperCase();
  const match = /^(\d{1,8})([\dK])$/.exec(compact);
  if (!match) return null;
  const body = match[1] as string;
  const dv = match[2] as string;

  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rest = 11 - (sum % 11);
  const expected = rest === 11 ? '0' : rest === 10 ? 'K' : String(rest);
  return dv === expected ? `${body}-${dv}` : null;
}
