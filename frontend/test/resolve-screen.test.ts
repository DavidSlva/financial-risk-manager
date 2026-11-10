import { describe, expect, it } from 'vitest';
import { resolveScreen } from '../src/resolve-screen';

describe('resolveScreen', () => {
  it('devuelve login-states solo en desarrollo y en la ruta exacta', () => {
    expect(resolveScreen('/dev/login-states', true)).toBe('login-states');
  });

  it('devuelve login en producción aunque la ruta coincida', () => {
    expect(resolveScreen('/dev/login-states', false)).toBe('login');
  });

  it('devuelve login para cualquier otra ruta', () => {
    expect(resolveScreen('/', true)).toBe('login');
    expect(resolveScreen('/dev/login-states/', true)).toBe('login');
    expect(resolveScreen('/dev', true)).toBe('login');
  });
});
