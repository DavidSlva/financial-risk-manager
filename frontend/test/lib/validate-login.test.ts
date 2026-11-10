import { describe, expect, it } from 'vitest';
import { LOGIN_LIMITS } from '../../src/config/login-limits.js';
import { validateLogin } from '../../src/lib/validate-login.js';

const RUT = '12.345.678-5';
const pw = (n: number) => 'a'.repeat(n);

describe('validateLogin', () => {
  it('acepta datos válidos y devuelve el RUT canónico', () => {
    expect(validateLogin({ rut: RUT, password: pw(8) })).toEqual({ ok: true, rut: '12345678-5' });
  });

  it('rechaza RUT con dígito verificador incorrecto, vacío o de 500 caracteres', () => {
    for (const rut of ['12345678-4', '', '1'.repeat(500)]) {
      expect(validateLogin({ rut, password: pw(8) })).toEqual({
        ok: false,
        fieldErrors: { rut: 'login.errors.rutInvalid' },
        firstInvalid: 'rut',
      });
    }
  });

  it('rechaza contraseña vacía con passwordInvalid', () => {
    expect(validateLogin({ rut: RUT, password: '' })).toEqual({
      ok: false,
      fieldErrors: { password: 'login.errors.passwordInvalid' },
      firstInvalid: 'password',
    });
  });

  it('aplica los bordes de largo de la contraseña (7, 8, 128, 129)', () => {
    const length = 'login.errors.passwordLength';
    expect(validateLogin({ rut: RUT, password: pw(7) })).toMatchObject({
      ok: false,
      fieldErrors: { password: length },
    });
    expect(validateLogin({ rut: RUT, password: pw(8) }).ok).toBe(true);
    expect(validateLogin({ rut: RUT, password: pw(128) }).ok).toBe(true);
    expect(validateLogin({ rut: RUT, password: pw(129) })).toMatchObject({
      ok: false,
      fieldErrors: { password: length },
    });
  });

  it('cuenta puntos de código Unicode, no unidades UTF-16', () => {
    const emoji = '\u{1F600}';
    expect(validateLogin({ rut: RUT, password: emoji.repeat(8) }).ok).toBe(true);
    expect(validateLogin({ rut: RUT, password: emoji.repeat(7) }).ok).toBe(false);
    expect(validateLogin({ rut: RUT, password: emoji.repeat(128) }).ok).toBe(true);
    expect(validateLogin({ rut: RUT, password: emoji.repeat(129) }).ok).toBe(false);
  });

  it('no recorta la contraseña: 8 espacios son válidos', () => {
    expect(validateLogin({ rut: RUT, password: ' '.repeat(8) }).ok).toBe(true);
    expect(validateLogin({ rut: RUT, password: ' abcdef ' }).ok).toBe(true);
    expect(validateLogin({ rut: RUT, password: ' abcde ' }).ok).toBe(false);
  });

  it('reporta el RUT primero y ambos errores a la vez', () => {
    expect(validateLogin({ rut: 'x', password: '' })).toEqual({
      ok: false,
      fieldErrors: { rut: 'login.errors.rutInvalid', password: 'login.errors.passwordInvalid' },
      firstInvalid: 'rut',
    });
  });

  it('respeta los límites recibidos', () => {
    const limits = { rut: LOGIN_LIMITS.rut, password: { min: 10, max: 12 } } as const;
    expect(validateLogin({ rut: RUT, password: pw(9) }, limits).ok).toBe(false);
    expect(validateLogin({ rut: RUT, password: pw(10) }, limits).ok).toBe(true);
    const rutLimits = { rut: { min: 9, max: 9 }, password: LOGIN_LIMITS.password } as const;
    expect(validateLogin({ rut: '10000013-K', password: pw(8) }, rutLimits)).toMatchObject({
      ok: false,
      fieldErrors: { rut: 'login.errors.rutInvalid' },
    });
  });
});
