import { describe, expect, it } from 'vitest';
import { isValidRut } from '../../src/services/rut.service.js';

describe('rut.service › isValidRut', () => {
  describe('formato canónico con dígito verificador correcto', () => {
    it.each([
      ['12345678-5', 'ejemplo canónico'],
      ['1000005-K', 'DV K, cuerpo de 7 dígitos'],
      ['1000030-0', 'DV 0'],
      ['11111111-1', 'dígitos repetidos'],
      ['22222222-2', 'dígitos repetidos'],
      ['99999999-9', 'máximo del rango'],
      ['1000000-9', 'mínimo del rango'],
    ])('acepta %s (%s)', (rut) => {
      expect(isValidRut(rut)).toBe(true);
    });
  });

  describe('dígito verificador', () => {
    it.each(['12345678-4', '12345678-0', '12345678-K', '1000005-5', '1000030-K', '11111111-2'])(
      'rechaza %s (DV incorrecto)',
      (rut) => {
        expect(isValidRut(rut)).toBe(false);
      },
    );

    it('el DV 10 es K y el DV 11 es 0', () => {
      expect(isValidRut('1000005-K')).toBe(true);
      expect(isValidRut('1000005-10')).toBe(false);
      expect(isValidRut('1000030-0')).toBe(true);
      expect(isValidRut('1000030-11')).toBe(false);
    });
  });

  describe('formato: no se normaliza, se rechaza', () => {
    it.each([
      ['12.345.678-5', 'con puntos'],
      ['123456785', 'sin guion'],
      ['12345678–5', 'guion tipográfico (–)'],
      ['12345678 - 5', 'espacios alrededor del guion'],
      ['1000005-k', 'k minúscula'],
      [' 12345678-5', 'espacio inicial'],
      ['12345678-5 ', 'espacio final'],
      ['12345678-5\n', 'salto de línea final'],
      ['012345678-5', 'cero a la izquierda'],
      ['0-0', 'cero'],
      ['123456-5', 'cuerpo de 6 dígitos'],
      ['123456789-5', 'cuerpo de 9 dígitos'],
      ['12345678-', 'sin DV'],
      ['-5', 'sin cuerpo'],
      ['abcdefgh-5', 'cuerpo no numérico'],
      ['12345678-55', 'DV de dos caracteres'],
      ['12345678-5-5', 'dos guiones'],
      ['１２３４５６７８-5', 'dígitos de ancho completo'],
    ])('rechaza %j (%s)', (rut) => {
      expect(isValidRut(rut)).toBe(false);
    });
  });

  describe('entradas que no son string', () => {
    it.each<[unknown, string]>([
      ['', 'string vacío'],
      [null, 'null'],
      [undefined, 'undefined'],
      [12345678, 'número'],
      [123456785, 'número con DV'],
      [true, 'booleano'],
      [{}, 'objeto'],
      [['12345678-5'], 'arreglo'],
      [{ toString: () => '12345678-5' }, 'objeto con toString'],
    ])('rechaza %j (%s)', (value) => {
      expect(isValidRut(value)).toBe(false);
    });
  });

  it('actúa como type guard sobre unknown', () => {
    const value: unknown = '12345678-5';

    if (isValidRut(value)) {
      const rut: string = value;
      expect(rut).toBe('12345678-5');
    } else {
      throw new Error('debía ser válido');
    }
  });

  it('no modifica ni recorta la entrada', () => {
    const input = '12345678-5';

    isValidRut(input);

    expect(input).toBe('12345678-5');
  });
});
