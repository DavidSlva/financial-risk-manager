import { describe, expect, it } from 'vitest';
import { initI18n } from '../../src/i18n/index';

const expected: Record<string, string> = {
  'login.title': 'Iniciar sesión',
  'login.subtitle': 'Ingresa tu RUT y contraseña para ver tu score.',
  'login.rut.label': 'RUT',
  'login.rut.placeholder': '12345678-K',
  'login.password.label': 'Contraseña',
  'login.password.show': 'Mostrar',
  'login.password.hide': 'Ocultar',
  'login.submit': 'Continuar',
  'login.submitting': 'Ingresando…',
  'login.errors.invalidCredentials':
    'RUT o contraseña incorrectos. Revisa tus datos; si ya lo intentaste varias veces, tu cuenta puede estar bloqueada.',
  'login.errors.badRequest': 'Revisa los datos ingresados.',
  'login.errors.tooManyRequests': 'Demasiados intentos. Espera unos minutos e inténtalo otra vez.',
  'login.errors.clientError':
    'No pudimos procesar la solicitud. Revisa los datos e inténtalo de nuevo.',
  'login.errors.serverError': 'Tenemos un problema de nuestro lado. Inténtalo en unos minutos.',
  'login.errors.network': 'No pudimos conectar. Revisa tu conexión.',
  'login.errors.passwordLength': 'La contraseña debe tener entre 8 y 128 caracteres.',
  'login.errors.rutInvalid': 'Ingresa un RUT válido.',
  'login.errors.passwordInvalid': 'Ingresa tu contraseña.',
};

describe('initI18n', () => {
  it('usa el idioma es', () => {
    expect(initI18n().language).toBe('es');
  });

  it('devuelve el texto exacto de cada llave', () => {
    const i18n = initI18n();
    for (const [key, text] of Object.entries(expected)) {
      expect(i18n.t(key)).toBe(text);
    }
  });

  it('devuelve la llave si no existe, sin lanzar', () => {
    expect(initI18n().t('login.noExiste')).toBe('login.noExiste');
  });

  it('es idempotente', () => {
    const a = initI18n();
    const b = initI18n();
    expect(b).toBe(a);
    expect(b.t('login.title')).toBe('Iniciar sesión');
  });
});
