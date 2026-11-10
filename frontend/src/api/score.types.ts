export type ScoreSuccess = { kind: 'ok'; rut: string; score: number; consultedAt: string };
export type ScoreFailureReason =
  | 'invalid-rut'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'client-error'
  | 'server-error'
  | 'network'
  | 'malformed';
export type ScoreFailure = {
  kind: 'error';
  reason: ScoreFailureReason;
  status?: number;
  messageKey: string;
};
export type ScoreOutcome = ScoreSuccess | ScoreFailure;
export type ScoreClient = (
  rut: string,
  options?: { signal?: AbortSignal },
) => Promise<ScoreOutcome>;
