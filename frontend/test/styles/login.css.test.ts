import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { styles } from '../../src/config/styles.config';
import { applyStyleTokens } from '../../src/styles/apply-tokens';

const css = readFileSync(resolve(import.meta.dirname, '../../src/styles/login.css'), 'utf8');
const mediaQuery = `@media (min-width: ${styles.sizes.cardBreakpoint}px)`;

// Sin comentarios ni la única media query permitida.
const body = css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((line) => !line.includes('@media (min-width:'))
  .join('\n');

describe('login.css', () => {
  it('no contiene colores literales', () => {
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(body).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/i);
  });

  it('no contiene medidas literales (px, rem, em, vh, vw, %) salvo 100%', () => {
    const withoutFull = body.replace(/\b100%/g, '');
    const matches = withoutFull.match(/(?<![\w-])-?\d*\.?\d+(px|rem|em|vh|vw|vmin|vmax|%)/g);
    expect(matches).toBeNull();
  });

  it('la única media query de ancho usa exactamente sizes.cardBreakpoint', () => {
    const queries = css.match(/@media \(min-width:[^)]*\)/g) ?? [];
    expect(queries).toEqual([mediaQuery]);
  });

  it('declara prefers-reduced-motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
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
