export type LoginSuccess = { kind: 'ok'; expiresIn: number; refreshExpiresIn: number };

export type LoginFailureReason =
  | 'bad-request'
  | 'unauthorized'
  | 'too-many-requests'
  | 'client-error'
  | 'server-error'
  | 'network'
  | 'malformed';

export type LoginFailure = {
  kind: 'error';
  reason: LoginFailureReason;
  status?: number;
  messageKey: string;
};

export type LoginOutcome = LoginSuccess | LoginFailure;

export type LoginCredentials = { rut: string; password: string };

export type LoginClient = (
  credentials: LoginCredentials,
  options?: { signal?: AbortSignal },
) => Promise<LoginOutcome>;
