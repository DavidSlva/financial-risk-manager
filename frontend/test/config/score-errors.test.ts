import { describe, expect, it } from 'vitest';

import { reasonForStatus, SCORE_ERROR_KEYS } from '../../src/config/score-errors.js';

describe('score-errors', () => {
  it('mapea razones a llaves', () => {
    expect(SCORE_ERROR_KEYS).toEqual({
      'invalid-rut': 'score.errors.invalidRut',
      unauthorized: 'score.errors.sessionExpired',
      forbidden: 'score.errors.forbidden',
      'not-found': 'score.errors.notFound',
      'client-error': 'score.errors.clientError',
      'server-error': 'score.errors.serverError',
      network: 'score.errors.network',
      malformed: 'score.errors.serverError',
    });
  });
  it('mapea status a razón', () => {
    expect(reasonForStatus(400)).toBe('invalid-rut');
    expect(reasonForStatus(401)).toBe('unauthorized');
    expect(reasonForStatus(403)).toBe('forbidden');
    expect(reasonForStatus(404)).toBe('not-found');
    expect(reasonForStatus(418)).toBe('client-error');
    expect(reasonForStatus(500)).toBe('server-error');
    expect(reasonForStatus(503)).toBe('server-error');
  });
});
