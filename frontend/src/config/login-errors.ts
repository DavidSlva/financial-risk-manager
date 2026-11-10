import type { LoginFailureReason } from '../api/login.types.js';

export const LOGIN_ERROR_KEYS: Record<LoginFailureReason, string> = {
  'bad-request': 'login.errors.badRequest',
  unauthorized: 'login.errors.invalidCredentials',
  'too-many-requests': 'login.errors.tooManyRequests',
  'client-error': 'login.errors.clientError',
  'server-error': 'login.errors.serverError',
  malformed: 'login.errors.serverError',
  network: 'login.errors.network',
};

export function reasonForStatus(status: number): LoginFailureReason {
  if (status === 400) return 'bad-request';
  if (status === 401) return 'unauthorized';
  if (status === 429) return 'too-many-requests';
  if (status >= 400 && status < 500) return 'client-error';
  return 'server-error';
}
