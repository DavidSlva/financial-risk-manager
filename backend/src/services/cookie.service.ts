/**
 * Parsea la cabecera `Cookie` (spec 009). Función pura, sin dependencias: ignora lo mal formado,
 * ante nombres repetidos toma la primera ocurrencia y devuelve un objeto sin prototipo (un
 * nombre como `__proto__` no puede contaminar nada).
 */
export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies = Object.create(null) as Record<string, string>;
  if (!header) return cookies;

  for (const piece of header.split(';')) {
    const separator = piece.indexOf('=');
    if (separator === -1) continue;

    const name = piece.slice(0, separator).trim();
    if (name === '' || /\s/.test(name) || name in cookies) continue;

    let value = piece.slice(separator + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    try {
      value = decodeURIComponent(value);
    } catch {
      // Codificación inválida: se conserva el valor tal cual.
    }
    cookies[name] = value;
  }
  return cookies;
}
