import { describe, expect, it } from 'vitest';
import { LOGIN_LIMITS } from '../../src/config/login-limits.js';

describe('LOGIN_LIMITS', () => {
  it('tiene los valores del contrato', () => {
    expect(LOGIN_LIMITS).toEqual({ rut: { min: 9, max: 10 }, password: { min: 8, max: 128 } });
  });
});
