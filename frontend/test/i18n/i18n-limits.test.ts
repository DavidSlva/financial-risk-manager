import { describe, expect, it, vi } from 'vitest';

describe('initI18n con LOGIN_LIMITS', () => {
  it('passwordLength usa los límites configurados', async () => {
    vi.resetModules();
    const { initI18n } = await import('../../src/i18n/index.js');
    expect(initI18n().t('login.errors.passwordLength')).toBe(
      'La contraseña debe tener entre 8 y 128 caracteres.',
    );

    vi.resetModules();
    const limits = (await import('../../src/config/login-limits.js')).LOGIN_LIMITS as {
      password: { min: number; max: number };
    };
    limits.password = { min: 10, max: 20 };
    const { initI18n: again } = await import('../../src/i18n/index.js');
    expect(again().t('login.errors.passwordLength')).toBe(
      'La contraseña debe tener entre 10 y 20 caracteres.',
    );
  });
});
