export interface HttpErrorDefinition {
  status: number;
  /** Mensaje genérico que ve el cliente. Nunca incluye detalle interno. */
  message: string;
  headers?: Record<string, string>;
}

/**
 * Tipos de error HTTP soportados. Agregar un tipo es agregar una entrada aquí:
 * el manejador de errores no cambia. Las rutas y controladores importan este mapa.
 */
export const HTTP_ERRORS = {
  BAD_REQUEST: { status: 400, message: 'Bad Request' },
  UNAUTHORIZED: {
    status: 401,
    message: 'Unauthorized',
    headers: { 'WWW-Authenticate': 'Bearer' },
  },
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  NOT_FOUND: { status: 404, message: 'Not Found' },
  INTERNAL_SERVER_ERROR: { status: 500, message: 'Internal Server Error' },
} as const satisfies Record<string, HttpErrorDefinition>;

export type HttpErrorType = keyof typeof HTTP_ERRORS;

/** Única clase de error de la API: solo guarda el tipo; el mensaje sale del mapa. */
export class HttpError extends Error {
  constructor(public readonly type: HttpErrorType) {
    super(HTTP_ERRORS[type].message);
    this.name = 'HttpError';
  }
}

/** Tipo del mapa que corresponde a un status HTTP, o `undefined` si no está soportado. */
export function httpErrorTypeFromStatus(status: unknown): HttpErrorType | undefined {
  return (Object.keys(HTTP_ERRORS) as HttpErrorType[]).find(
    (type) => HTTP_ERRORS[type].status === status,
  );
}
