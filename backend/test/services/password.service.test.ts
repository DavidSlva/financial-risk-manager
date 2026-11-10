import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCRYPT_PARAMS,
  hashPassword,
  isPasswordHash,
  isValidPassword,
  verifyPassword,
} from '../../src/services/password.service.js';

const LOW_COST = { N: 1024, r: 8, p: 1 } as const;

describe('password.service', () => {
  describe('isValidPassword (largo de 8 a 128 caracteres)', () => {
    it.each([
      ['a'.repeat(8), true],
      ['a'.repeat(128), true],
      ['a'.repeat(7), false],
      ['a'.repeat(129), false],
      ['', false],
      ['        ', true],
      ['una clave con espacios', true],
    ])('%j → %s', (password, expected) => {
      expect(isValidPassword(password)).toBe(expected);
    });

    it('cuenta puntos de código Unicode, no unidades UTF-16', () => {
      expect(isValidPassword('😀'.repeat(8))).toBe(true);
      expect(isValidPassword('😀'.repeat(7))).toBe(false);
      expect(isValidPassword('😀'.repeat(128))).toBe(true);
      expect(isValidPassword('😀'.repeat(129))).toBe(false);
    });

    it('no recorta ni normaliza: los espacios cuentan', () => {
      expect(isValidPassword('  abc  ')).toBe(false);
      expect(isValidPassword('  abcd  ')).toBe(true);
    });

    it.each([null, undefined, 12345678, true, {}, ['12345678'], { length: 10 }])(
      'rechaza lo que no es string: %j',
      (value) => {
        expect(isValidPassword(value)).toBe(false);
      },
    );
  });

  describe('hashPassword', () => {
    it('devuelve un hash con el formato scrypt$N$r$p$sal$hash', async () => {
      const hash = await hashPassword('una-clave-de-prueba', LOW_COST);

      expect(hash).toMatch(/^scrypt\$1024\$8\$1\$[A-Za-z0-9+/]+=*\$[A-Za-z0-9+/]+=*$/);
      expect(isPasswordHash(hash)).toBe(true);
    });

    it('usa por defecto N=2^15, r=8, p=3', async () => {
      expect(DEFAULT_SCRYPT_PARAMS).toEqual({ N: 32768, r: 8, p: 3 });

      const hash = await hashPassword('una-clave-de-prueba');

      expect(hash.startsWith('scrypt$32768$8$3$')).toBe(true);
    });

    it('no contiene la contraseña en claro', async () => {
      const hash = await hashPassword('una-clave-de-prueba', LOW_COST);

      expect(hash).not.toContain('una-clave-de-prueba');
    });

    it('usa una sal distinta en cada llamada', async () => {
      const [a, b] = await Promise.all([
        hashPassword('misma-clave-123', LOW_COST),
        hashPassword('misma-clave-123', LOW_COST),
      ]);

      expect(a).not.toBe(b);
    });
  });

  describe('verifyPassword', () => {
    it('acepta la contraseña correcta', async () => {
      const hash = await hashPassword('clave-correcta-1', LOW_COST);

      await expect(verifyPassword('clave-correcta-1', hash)).resolves.toBe(true);
    });

    it('rechaza una contraseña incorrecta', async () => {
      const hash = await hashPassword('clave-correcta-1', LOW_COST);

      await expect(verifyPassword('clave-correcta-2', hash)).resolves.toBe(false);
      await expect(verifyPassword('', hash)).resolves.toBe(false);
      await expect(verifyPassword('Clave-correcta-1', hash)).resolves.toBe(false);
    });

    it('verifica con los parámetros guardados en el hash (permite subir el costo)', async () => {
      const cheap = await hashPassword('clave-correcta-1', { N: 1024, r: 8, p: 1 });
      const costlier = await hashPassword('clave-correcta-1', { N: 2048, r: 8, p: 2 });

      await expect(verifyPassword('clave-correcta-1', cheap)).resolves.toBe(true);
      await expect(verifyPassword('clave-correcta-1', costlier)).resolves.toBe(true);
    });

    it('devuelve una promesa (no bloquea el bucle de eventos)', async () => {
      const hash = await hashPassword('clave-correcta-1', LOW_COST);

      expect(verifyPassword('clave-correcta-1', hash)).toBeInstanceOf(Promise);
    });

    it.each([
      ['vacío', ''],
      ['texto cualquiera', 'no-es-un-hash'],
      ['otro algoritmo', 'bcrypt$1024$8$1$c2FsdA==$aGFzaA=='],
      ['faltan partes', 'scrypt$1024$8$1$c2FsdA=='],
      ['partes de más', 'scrypt$1024$8$1$c2FsdA==$aGFzaA==$extra'],
      ['N no numérico', 'scrypt$mil$8$1$c2FsdA==$aGFzaA=='],
      ['N no es potencia de dos', 'scrypt$1000$8$1$c2FsdA==$aGFzaA=='],
      ['N absurdo (memoria)', 'scrypt$1073741824$8$1$c2FsdA==$aGFzaA=='],
      ['N demasiado bajo', 'scrypt$2$8$1$c2FsdA==$aGFzaA=='],
      ['r fuera de rango', 'scrypt$1024$0$1$c2FsdA==$aGFzaA=='],
      ['p fuera de rango', 'scrypt$1024$8$0$c2FsdA==$aGFzaA=='],
      ['sal vacía', 'scrypt$1024$8$1$$aGFzaA=='],
      ['hash vacío', 'scrypt$1024$8$1$c2FsdA==$'],
    ])('un hash mal formado verifica como false (%s)', async (_label, hash) => {
      await expect(verifyPassword('clave-correcta-1', hash)).resolves.toBe(false);
    });
  });

  describe('isPasswordHash', () => {
    it('acepta un hash generado', async () => {
      expect(isPasswordHash(await hashPassword('clave-correcta-1', LOW_COST))).toBe(true);
    });

    it.each([
      '',
      'scrypt',
      'scrypt$1024$8$1$c2FsdA==',
      'bcrypt$1024$8$1$c2FsdA==$aGFzaA==',
      'scrypt$1000$8$1$c2FsdA==$aGFzaA==',
      'scrypt$1024$8$1$c2Fs dA==$aGFzaA==',
    ])('rechaza %j', (value) => {
      expect(isPasswordHash(value)).toBe(false);
    });

    it.each([null, undefined, 123, {}, ['scrypt']])('rechaza lo que no es string: %j', (value) => {
      expect(isPasswordHash(value)).toBe(false);
    });
  });
});
