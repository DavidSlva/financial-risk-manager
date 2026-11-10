import { describe, expect, it } from 'vitest';

import { styles, type StylesConfig } from '../../src/config/styles.config.js';
import { applyStyleTokens, toCssVarName } from '../../src/styles/apply-tokens.js';

describe('toCssVarName', () => {
  it('convierte la clave a kebab-case', () => {
    expect(toCssVarName('colors', 'textMuted')).toBe('--colors-text-muted');
    expect(toCssVarName('radius', 'card')).toBe('--radius-card');
  });
});

describe('applyStyleTokens', () => {
  it('publica colores y radios', () => {
    const root = document.createElement('div');
    applyStyleTokens(styles, root);
    expect(root.style.getPropertyValue('--colors-danger')).toBe('#ff6166');
    expect(root.style.getPropertyValue('--radius-card')).toBe('12px');
  });

  it('usa document.documentElement por defecto', () => {
    applyStyleTokens();
    expect(document.documentElement.style.getPropertyValue('--radius-field')).toBe('6px');
  });

  it('publica cada clave de cada grupo', () => {
    const root = document.createElement('div');
    applyStyleTokens(styles, root);
    for (const [group, values] of Object.entries(styles)) {
      for (const key of Object.keys(values)) {
        expect(root.style.getPropertyValue(toCssVarName(group, key)), `${group}.${key}`).not.toBe(
          '',
        );
      }
    }
  });

  it('aplica unidades: px, ms y pesos sin unidad', () => {
    const root = document.createElement('div');
    applyStyleTokens(styles, root);
    expect(root.style.getPropertyValue('--motion-transition-duration')).toBe('150ms');
    expect(root.style.getPropertyValue('--sizes-touch-target')).toBe('44px');
    expect(root.style.getPropertyValue('--typography-weight-title')).toBe('600');
    expect(root.style.getPropertyValue('--typography-letter-spacing-title')).toBe('-0.02em');
  });

  it('refleja una configuración modificada', () => {
    const root = document.createElement('div');
    const custom: StylesConfig = {
      ...styles,
      colors: { ...styles.colors, danger: '#f00' as never },
    };
    applyStyleTokens(custom, root);
    expect(root.style.getPropertyValue('--colors-danger')).toBe('#f00');
  });
});
