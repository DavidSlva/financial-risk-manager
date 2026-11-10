import { describe, expect, it } from 'vitest';

import { normalizeRut } from '../../src/lib/rut.js';

describe('normalizeRut', () => {
  it('acepta puntos y guion', () => {
    expect(normalizeRut('12.345.678-5')).toBe('12345678-5');
  });
  it('acepta sin puntos', () => {
    expect(normalizeRut('12345678-5')).toBe('12345678-5');
  });
  it('acepta sin guion', () => {
    expect(normalizeRut('123456785')).toBe('12345678-5');
  });
  it('acepta rut corto y repetidos', () => {
    expect(normalizeRut('1-9')).toBe('1-9');
    expect(normalizeRut('11.111.111-1')).toBe('11111111-1');
  });
  it('acepta K y k, y dígito 0', () => {
    expect(normalizeRut('6-k')).toBe('6-K');
    expect(normalizeRut('6-K')).toBe('6-K');
    expect(normalizeRut('14-0')).toBe('14-0');
    expect(normalizeRut('13-0')).toBeNull();
  });
  it('rechaza dígito verificador incorrecto', () => {
    expect(normalizeRut('12.345.678-9')).toBeNull();
  });
  it('rechaza basura', () => {
    expect(normalizeRut('')).toBeNull();
    expect(normalizeRut('   ')).toBeNull();
    expect(normalizeRut('abcdefgh-1')).toBeNull();
    expect(normalizeRut('--')).toBeNull();
    expect(normalizeRut('1234567890-5')).toBeNull();
    expect(normalizeRut('12 345 678-5')).toBeNull();
    expect(normalizeRut('1'.repeat(500))).toBeNull();
  });
});
