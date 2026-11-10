# Plan — 012-errores-http

Spec: [../../specs/012-errores-http.md](../../specs/012-errores-http.md)

## Enfoque

Datos en lugar de código: el mapa describe cada error y el manejador lo interpreta. `HttpError` es la única clase de error de la API; solo guarda el tipo.

## Diseño

```ts
// config/http-errors.ts
export interface HttpErrorDefinition {
  status: number;
  message: string;
  headers?: Record<string, string>;
}

export const HTTP_ERRORS = {
  BAD_REQUEST: { status: 400, message: 'Bad Request' },
  UNAUTHORIZED: { status: 401, message: 'Unauthorized', headers: { 'WWW-Authenticate': 'Bearer' } },
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  NOT_FOUND: { status: 404, message: 'Not Found' },
  INTERNAL_SERVER_ERROR: { status: 500, message: 'Internal Server Error' },
} as const satisfies Record<string, HttpErrorDefinition>;

export type HttpErrorType = keyof typeof HTTP_ERRORS;
export class HttpError extends Error {
  constructor(readonly type: HttpErrorType) {
    super(HTTP_ERRORS[type].message);
  }
}
export function httpErrorTypeFromStatus(status: unknown): HttpErrorType | undefined;
```

El manejador: `HttpError` → su tipo; error con `status` soportado → ese tipo; otro → `INTERNAL_SERVER_ERROR` (con `console.error`).

## Decisiones técnicas

| Decisión                                         | Alternativas                     | Motivo                                                                  |
| ------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------- |
| Mapa de datos + manejador único                  | Un middleware o clase por error  | Pedido explícito: lo otro no es mantenible                              |
| `HttpError` solo con el tipo (sin mensaje libre) | `new HttpError(status, message)` | Garantiza mensajes genéricos y coherentes; el cliente nunca ve detalle  |
| `HttpError` en `config/http-errors.ts`           | `models/` o `errors/`            | Un solo import para el mapa y su clase; las rutas importan de `config/` |
| `as const satisfies`                             | Tipo `Record<string, …>` abierto | `HttpErrorType` se deriva del mapa: un tipo nuevo se agrega en un lugar |
| Traducir `status` de librerías al tipo soportado | Todo error ajeno es 500          | El JSON malformado es un 400 del cliente, no un fallo del servidor      |
| Quitar `path` del 404                            | Mantenerlo                       | Respuesta uniforme `{ error }`; no se refleja la entrada del cliente    |

## Riesgos

- Un error ajeno con `status` soportado pero que revele detalle: el cuerpo siempre sale del mapa, nunca del error original.

## Verificación (TDD)

Pruebas del mapa y de `HttpError`; del manejador (cada tipo, error ajeno, `status` soportado y no soportado, cabeceras); de la aplicación (404 uniforme, JSON malformado → 400); y las pruebas existentes de auth migradas a `HttpError('UNAUTHORIZED')`.
