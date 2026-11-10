import { describe, expect, it } from 'vitest';
import { SCORE_ERROR_KEYS } from '../../src/config/score-errors';
import { initI18n } from '../../src/i18n/index';

const t = (key: string) => initI18n().t(key);

describe('llaves score.* en es.json', () => {
  const expected: Record<string, string> = {
    'score.title': 'Consulta tu score',
    'score.subtitle': 'Ingresa un RUT para ver su score.',
    'score.rut.label': 'RUT',
    'score.submit': 'Consultar',
    'score.submitting': 'Consultando…',
    'score.date.label': 'Fecha del score',
    'score.errors.invalidRut': 'Ingresa un RUT válido.',
    'score.errors.sessionExpired': 'Tu sesión expiró. Vuelve a iniciar sesión.',
    'score.errors.forbidden': 'No tienes permiso para ver el score de este RUT.',
    'score.errors.notFound': 'No encontramos un score para este RUT.',
    'score.errors.clientError':
      'No pudimos procesar la consulta. Revisa los datos e inténtalo de nuevo.',
    'score.errors.serverError': 'Tenemos un problema de nuestro lado. Inténtalo en unos minutos.',
    'score.errors.network': 'No pudimos conectar. Revisa tu conexión.',
  };

  for (const [key, text] of Object.entries(expected)) {
    it(`${key} devuelve su texto`, () => {
      expect(t(key)).toBe(text);
    });
  }

  it('cada llave de SCORE_ERROR_KEYS existe y no devuelve la llave', () => {
    for (const key of Object.values(SCORE_ERROR_KEYS)) {
      expect(t(key)).not.toBe(key);
    }
  });

  it('conserva las llaves de login', () => {
    expect(t('login.title')).toBe('Iniciar sesión');
  });
});
