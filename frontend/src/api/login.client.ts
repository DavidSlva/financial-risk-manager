import { apiUrl } from '../config/api.config.js';
import { LOGIN_ERROR_KEYS, reasonForStatus } from '../config/login-errors.js';
import type { LoginClient, LoginFailure, LoginFailureReason } from './login.types.js';

function failure(reason: LoginFailureReason, status?: number): LoginFailure {
  const result: LoginFailure = { kind: 'error', reason, messageKey: LOGIN_ERROR_KEYS[reason] };
  if (status !== undefined) result.status = status;
  return result;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isAbortError(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'AbortError';
}

export function createLoginClient(
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): LoginClient {
  return async (credentials, options) => {
    let response: Response;
    try {
      const init: RequestInit = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ rut: credentials.rut, password: credentials.password }),
      };
      if (options?.signal) init.signal = options.signal;
      response = await fetchImpl(apiUrl('/auth/login'), init);
    } catch (error) {
      if (isAbortError(error)) throw error;
      return failure('network');
    }

    if (response.status !== 200) return failure(reasonForStatus(response.status), response.status);

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      if (isAbortError(error)) throw error;
      return failure('malformed', 200);
    }
    const data = body as { expiresIn?: unknown; refreshExpiresIn?: unknown } | null;
    if (
      typeof data === 'object' &&
      data !== null &&
      isFiniteNumber(data.expiresIn) &&
      isFiniteNumber(data.refreshExpiresIn)
    ) {
      return { kind: 'ok', expiresIn: data.expiresIn, refreshExpiresIn: data.refreshExpiresIn };
    }
    return failure('malformed', 200);
  };
}

export const loginClient: LoginClient = createLoginClient();
