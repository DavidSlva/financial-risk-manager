import { describe, expect, it } from 'vitest';

import { styles } from '../../src/config/styles.config.js';

const AA_NORMAL_TEXT = 4.5;

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const { colors } = styles;

const pairs: [string, string, string][] = [
  ['text', colors.text, colors.background],
  ['text', colors.text, colors.surface],
  ['textMuted', colors.textMuted, colors.surface],
  ['textMuted', colors.textMuted, colors.background],
  ['danger', colors.danger, colors.surface],
  ['danger', colors.danger, colors.background],
  ['buttonText', colors.buttonText, colors.buttonBackground],
];

describe('styles.colors contraste WCAG AA', () => {
  it.each(pairs)('%s (%s sobre %s) alcanza 4.5:1', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
