import { describe, expect, it } from 'vitest';
import es from '../../src/i18n/es.json';

describe('es.json (015)', () => {
  it('trae los avisos y el marcador de sesión', () => {
    expect(es.login.notices.sessionExpired).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
    expect(es.session.placeholder.title).toBe('Sesión iniciada');
    expect(es.session.placeholder.rut).toBe('RUT');
  });
});
