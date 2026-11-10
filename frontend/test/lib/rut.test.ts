import { describe, expect, it } from 'vitest';
import { normalizeRut } from '../../src/lib/rut.js';

describe('normalizeRut', () => {
  it('normaliza con y sin puntos y guion', () => {
    expect(normalizeRut('12.345.678-5')).toBe('12345678-5');
    expect(normalizeRut('123456785')).toBe('12345678-5');
    expect(normalizeRut('12345678-5')).toBe('12345678-5');
  });

  it('acepta k y K como dígito verificador y devuelve K', () => {
    expect(normalizeRut('10000013-K')).toBe('10000013-K');
    expect(normalizeRut('10000013-k')).toBe('10000013-K');
    expect(normalizeRut('10.000.013k')).toBe('10000013-K');
  });

  it('acepta 0 como dígito verificador', () => {
    expect(normalizeRut('14-0')).toBe('14-0');
  });

  it('rechaza dígito verificador incorrecto', () => {
    expect(normalizeRut('12345678-4')).toBeNull();
    expect(normalizeRut('10000013-9')).toBeNull();
  });

  it('rechaza vacío, letras y entradas enormes', () => {
    expect(normalizeRut('')).toBeNull();
    expect(normalizeRut('abc')).toBeNull();
    expect(normalizeRut('1234a678-5')).toBeNull();
    expect(normalizeRut('-')).toBeNull();
    expect(normalizeRut('1'.repeat(500))).toBeNull();
  });
});
