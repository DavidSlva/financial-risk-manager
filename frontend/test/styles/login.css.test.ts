import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { styles } from '../../src/config/styles.config';
import { applyStyleTokens } from '../../src/styles/apply-tokens';

const css = readFileSync(resolve(import.meta.dirname, '../../src/styles/login.css'), 'utf8');

const allowedWidthQuery = `@media (min-width: ${styles.sizes.cardBreakpoint}px)`;
const allowedMotionQuery = '@media (prefers-reduced-motion: reduce)';

const NAMED_COLORS = [
  'red',
  'white',
  'black',
  'gray',
  'grey',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'brown',
  'cyan',
  'magenta',
  'silver',
  'navy',
  'teal',
  'maroon',
  'olive',
  'lime',
  'aqua',
  'fuchsia',
  'gold',
  'crimson',
  'coral',
  'salmon',
  'indigo',
  'violet',
  'tomato',
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Quita únicamente las condiciones de media query permitidas (nada más). */
function withoutAllowedQueries(source: string): string {
  return source.replaceAll(allowedWidthQuery, '').replaceAll(allowedMotionQuery, '');
}

/**
 * Formas literales permitidas, sin ser medidas de diseño: `0`, `1` sin unidad,
 * `auto`, palabras clave y `100%` (ancho/alto relativo al contenedor, no un valor
 * de diseño). Cualquier otro número con unidad se rechaza.
 */
function removeAllowedPercent(source: string): string {
  return source.replace(/(?<![\w.-])100%/g, '');
}

const UNIT =
  'px|rem|em|ex|ch|pt|pc|cm|mm|in|vh|vw|vmin|vmax|dvh|dvw|svh|svw|lvh|lvw|deg|rad|grad|turn|ms|s|%';

export function findLiteralViolations(source: string): string[] {
  const text = removeAllowedPercent(withoutAllowedQueries(stripComments(source)));
  const found: string[] = [];
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) found.push(m[0]);
  for (const m of text.matchAll(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi))
    found.push(m[0]);
  const named = new RegExp(String.raw`(?<![\w-])(?:${NAMED_COLORS.join('|')})(?![\w-])`, 'gi');
  for (const m of text.matchAll(named)) found.push(m[0]);
  const measure = new RegExp(
    String.raw`(?<![\w-])[+-]?(?:\d+\.?\d*|\.\d+)(?:${UNIT})(?![\w-])`,
    'gi',
  );
  for (const m of text.matchAll(measure)) found.push(m[0]);
  return found;
}

describe('login.css', () => {
  it('no contiene colores ni medidas literales', () => {
    expect(findLiteralViolations(css)).toEqual([]);
  });

  it('el verificador detecta literales (0.15s, red, #fff, 12px, 1turn, 50%)', () => {
    expect(findLiteralViolations('a { transition: color 0.15s; }')).toEqual(['0.15s']);
    expect(findLiteralViolations('a { color: red; }')).toEqual(['red']);
    expect(findLiteralViolations('a { color: #fff; }')).toEqual(['#fff']);
    expect(findLiteralViolations('a { color: rgb(0 0 0); }')).toEqual(['rgb(']);
    expect(findLiteralViolations('a { margin: 12px; }')).toEqual(['12px']);
    expect(findLiteralViolations('a { transform: rotate(1turn); }')).toEqual(['1turn']);
    expect(findLiteralViolations('a { width: 50%; }')).toEqual(['50%']);
    expect(findLiteralViolations('a { width: 100%; margin: 0; flex: 1; top: auto; }')).toEqual([]);
    expect(findLiteralViolations('@media (min-width: 481px) { a { b: c } }')).toEqual(['481px']);
  });

  it('las únicas media queries son el breakpoint exacto (sizes.cardBreakpoint) y reduced-motion', () => {
    const queries = [...stripComments(css).matchAll(/@media[^{]*/g)].map((m) => m[0].trim());
    expect(queries).toEqual([allowedWidthQuery, allowedMotionQuery]);
    expect(allowedWidthQuery).toBe('@media (min-width: 480px)');
  });

  it('cada var(--…) usada existe entre las variables publicadas por applyStyleTokens', () => {
    const root = document.createElement('div');
    applyStyleTokens(styles, root);
    const published = new Set<string>();
    for (let i = 0; i < root.style.length; i += 1) published.add(root.style.item(i));

    const used = [...css.matchAll(/var\((--[\w-]+)/g)].flatMap((m) => m[1] ?? []);
    expect(used.length).toBeGreaterThan(0);
    const missing = used.filter((name) => !published.has(name));
    expect(missing).toEqual([]);
  });
});
