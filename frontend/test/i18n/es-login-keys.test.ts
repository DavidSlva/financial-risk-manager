import { describe, expect, it } from 'vitest';
import es from '../../src/i18n/es.json';

describe('es.json (015)', () => {
  it('trae el aviso de sesión expirada', () => {
    expect(es.login.notices.sessionExpired).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
    expect('session' in es).toBe(false);
  });
});
