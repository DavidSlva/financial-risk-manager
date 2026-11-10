import { describe, expect, it } from 'vitest';

import { styles } from '../../src/config/styles.config.js';

describe('styles.config', () => {
  it('define los diez colores de la spec', () => {
    expect(styles.colors).toEqual({
      background: '#000000',
      surface: '#0a0a0a',
      border: '#333333',
      borderFocus: '#ededed',
      text: '#ededed',
      textMuted: '#a1a1a1',
      textDisabled: '#6b6b6b',
      danger: '#ff6166',
      buttonBackground: '#ededed',
      buttonText: '#000000',
    });
  });

  it('define los dos radios', () => {
    expect(styles.radius).toEqual({ field: 6, card: 12 });
  });

  it('define los tamaños clave', () => {
    expect(styles.sizes.touchTarget).toBe(44);
    expect(styles.sizes.cardMaxWidth).toBe(400);
    expect(styles.sizes.cardBreakpoint).toBe(480);
    expect(styles.sizes.mobileGutter).toBe(24);
    expect(styles.sizes.borderWidth).toBe(1);
    expect(styles.motion.transitionDuration).toBe(150);
  });

  it('define los tokens del indicador de carga y del anillo de foco', () => {
    expect(styles.sizes.focusRingWidth).toBe(2);
    expect(styles.sizes.spinnerSize).toBe(16);
    expect(styles.sizes.spinnerBorderWidth).toBe(2);
    expect(styles.motion.spinnerDuration).toBe(750);
    expect(styles.motion.spinnerTurn).toBe('1turn');
  });

  it('el ancho del toggle de contraseña cubre el alto táctil', () => {
    expect(styles.sizes.passwordToggleWidth).toBe(72);
    expect(styles.sizes.passwordToggleWidth).toBeGreaterThanOrEqual(styles.sizes.touchTarget);
  });
});

describe('styles.config (spec 016)', () => {
  it('define el tamaño del score destacado', () => {
    expect(styles.typography.sizeScore).toBe(56);
  });
});
