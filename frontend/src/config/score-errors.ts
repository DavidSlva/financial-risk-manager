import type { ScoreFailureReason } from '../api/score.types.js';

export const SCORE_ERROR_KEYS: Record<ScoreFailureReason, string> = {
  'invalid-rut': 'score.errors.invalidRut',
  unauthorized: 'score.errors.sessionExpired',
  forbidden: 'score.errors.forbidden',
  'not-found': 'score.errors.notFound',
  'client-error': 'score.errors.clientError',
  'server-error': 'score.errors.serverError',
  network: 'score.errors.network',
  malformed: 'score.errors.serverError',
};

export function reasonForStatus(status: number): ScoreFailureReason {
  if (status === 400) return 'invalid-rut';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status >= 500) return 'server-error';
  return 'client-error';
}
