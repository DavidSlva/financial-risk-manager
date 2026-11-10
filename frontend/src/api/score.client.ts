import { reasonForStatus, SCORE_ERROR_KEYS } from '../config/score-errors.js';
import type { ScoreClient, ScoreFailure, ScoreFailureReason, ScoreOutcome } from './score.types.js';

function failure(reason: ScoreFailureReason, status?: number): ScoreFailure {
  return status === undefined
    ? { kind: 'error', reason, messageKey: SCORE_ERROR_KEYS[reason] }
    : { kind: 'error', reason, status, messageKey: SCORE_ERROR_KEYS[reason] };
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

async function parseSuccess(response: Response): Promise<ScoreOutcome> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return failure('malformed', response.status);
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return failure('malformed', response.status);
  }
  const { rut, score, fecha } = body as Record<string, unknown>;
  if (
    typeof rut !== 'string' ||
    rut === '' ||
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    typeof fecha !== 'string' ||
    Number.isNaN(Date.parse(fecha))
  ) {
    return failure('malformed', response.status);
  }
  return { kind: 'ok', rut, score, fecha };
}

export function createScoreClient(fetchImpl?: typeof fetch): ScoreClient {
  return async (rut, options) => {
    const doFetch = fetchImpl ?? fetch;
    let response: Response;
    try {
      const init: RequestInit = {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      };
      if (options?.signal) init.signal = options.signal;
      response = await doFetch(`/api/score/${encodeURIComponent(rut)}`, init);
    } catch (error) {
      if (isAbortError(error)) throw error;
      return failure('network');
    }
    if (response.status !== 200) return failure(reasonForStatus(response.status), response.status);
    return parseSuccess(response);
  };
}

export const fetchScore: ScoreClient = createScoreClient();
