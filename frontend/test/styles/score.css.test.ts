import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { styles } from '../../src/config/styles.config';
import { applyStyleTokens } from '../../src/styles/apply-tokens';

const css = readFileSync(resolve(import.meta.dirname, '../../src/styles/score.css'), 'utf8');

function strip(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll('@media (prefers-reduced-motion: reduce)', '')
    .replace(/(?<![\w.-])100%/g, '');
}

describe('score.css', () => {
  it('no contiene colores ni medidas literales', () => {
    const text = strip(css);
    expect(text.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    expect(text.match(/\b(?:rgba?|hsla?|oklch|color)\(/gi)).toBeNull();
    expect(
      text.match(
        /(?<![\w-])[+-]?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|ch|vh|vw|deg|turn|ms|s|%)(?![\w-])/gi,
      ),
    ).toBeNull();
  });

  it('cada var(--…) usada existe entre las variables publicadas', () => {
    const root = document.createElement('div');
    applyStyleTokens(styles, root);
    const published = new Set<string>();
    for (let i = 0; i < root.style.length; i += 1) published.add(root.style.item(i));
    const used = [...css.matchAll(/var\((--[\w-]+)/g)].flatMap((m) => m[1] ?? []);
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((name) => !published.has(name))).toEqual([]);
  });
});
