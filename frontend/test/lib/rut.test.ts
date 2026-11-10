import { describe, expect, it } from 'vitest';

import { normalizeRut } from '../../src/lib/rut.js';

describe('normalizeRut', () => {
  it('normaliza con y sin puntos y guion', () => {
    expect(normalizeRut('12.345.678-5')).toBe('12345678-5');
    expect(normalizeRut('123456785')).toBe('12345678-5');
    expect(normalizeRut('12345678-5')).toBe('12345678-5');
  });

  it('acepta rut corto y repetidos', () => {
    expect(normalizeRut('1-9')).toBe('1-9');
    expect(normalizeRut('11.111.111-1')).toBe('11111111-1');
  });

  it('acepta k y K como dígito verificador y devuelve K', () => {
    expect(normalizeRut('10000013-K')).toBe('10000013-K');
    expect(normalizeRut('10000013-k')).toBe('10000013-K');
    expect(normalizeRut('10.000.013k')).toBe('10000013-K');
    expect(normalizeRut('6-k')).toBe('6-K');
    expect(normalizeRut('6-K')).toBe('6-K');
  });

  it('acepta 0 como dígito verificador y rechaza el 0 incorrecto', () => {
    expect(normalizeRut('14-0')).toBe('14-0');
    expect(normalizeRut('13-0')).toBeNull();
  });

  it('rechaza dígito verificador incorrecto', () => {
    expect(normalizeRut('12345678-4')).toBeNull();
    expect(normalizeRut('10000013-9')).toBeNull();
    expect(normalizeRut('12.345.678-9')).toBeNull();
  });

  it('recorta los espacios al inicio y al final', () => {
    expect(normalizeRut('  12.345.678-5  ')).toBe('12345678-5');
    expect(normalizeRut('\t10000013-k\n')).toBe('10000013-K');
  });

  it('rechaza vacío, solo espacios, letras, espacios internos y entradas enormes', () => {
    expect(normalizeRut('')).toBeNull();
    expect(normalizeRut('   ')).toBeNull();
    expect(normalizeRut('abc')).toBeNull();
    expect(normalizeRut('abcdefgh-1')).toBeNull();
    expect(normalizeRut('1234a678-5')).toBeNull();
    expect(normalizeRut('-')).toBeNull();
    expect(normalizeRut('--')).toBeNull();
    expect(normalizeRut('1234567890-5')).toBeNull();
    expect(normalizeRut('12 345 678-5')).toBeNull();
    expect(normalizeRut('1'.repeat(500))).toBeNull();
  });
});
