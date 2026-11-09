---
id: 012-errores-http
title: Mapa de errores HTTP en config y manejador de errores único
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [005-backend-estructura, 007-auth-jwt, 010-tdd-vitest]
related: [011-rbac]
supersedes: []
superseded_by: []
---

# 012-errores-http — Mapa de errores HTTP

## Resumen

Un middleware por tipo de error no escala. Se reemplaza por **un único manejador de errores** que se apoya en un **mapa de tipos de error HTTP soportados**, definido en `config/`. Cualquier capa lanza un `HttpError` de un tipo del mapa; las **rutas y controladores importan el mismo mapa** para lanzar o referenciar errores, sin duplicar códigos ni mensajes.

## Alcance

**Incluye:** mapa de errores en `config/http-errors.ts`, clase `HttpError`, manejador de errores único, `not-found` y `authenticate` sobre el mapa, migración del código existente (`AuthenticationError`, 400 del refresh), pruebas.
**No incluye:** formato de error con detalles de validación, códigos de aplicación propios, internacionalización de mensajes.

## Requisitos

- RF-1: `config/http-errors.ts` exporta el mapa `HTTP_ERRORS`: tipo → `{ status, message, headers? }`. Tipos soportados: `BAD_REQUEST` (400), `UNAUTHORIZED` (401, con `WWW-Authenticate: Bearer`), `FORBIDDEN` (403), `NOT_FOUND` (404) e `INTERNAL_SERVER_ERROR` (500).
- RF-2: `HttpError` (en el mismo archivo) se construye con un tipo del mapa: `new HttpError('FORBIDDEN')`. Su mensaje sale del mapa; no acepta mensajes libres.
- RF-3: Un **único** `error-handler.middleware` traduce cualquier error: `HttpError` según el mapa; cualquier otro, a `INTERNAL_SERVER_ERROR` (se registra en el log, sin filtrar el detalle al cliente). Agregar un tipo nuevo es agregar una entrada al mapa, sin tocar el manejador.
- RF-4: Errores de librerías con `status` soportado (p. ej. el 400 de un JSON malformado que lanza `express.json()`) se traducen al tipo correspondiente; con un `status` no soportado, a 500.
- RF-5: Respuesta uniforme: `{ "error": "<mensaje del mapa>" }` y las cabeceras que defina la entrada.
- RF-6: Las rutas, controladores, servicios y middlewares lanzan `HttpError`; ninguno arma respuestas de error a mano. `AuthenticationError` desaparece: se reemplaza por `HttpError('UNAUTHORIZED')`.
- RF-7: El `404` de ruta inexistente usa el mapa (`NOT_FOUND`). Ya no devuelve la ruta consultada en el cuerpo.

## Diseño

```
backend/src/
├── config/http-errors.ts                  # HTTP_ERRORS, HttpErrorType, HttpError
├── middlewares/
│   ├── error-handler.middleware.ts        # único manejador, basado en el mapa
│   ├── not-found.middleware.ts            # next(new HttpError('NOT_FOUND'))
│   └── authenticate.middleware.ts         # lanza HttpError('UNAUTHORIZED')
├── services/auth.service.ts               # lanza HttpError('UNAUTHORIZED')
└── controllers/auth.controller.ts         # lanza HttpError('BAD_REQUEST')
```

```ts
// uso desde cualquier capa
throw new HttpError('FORBIDDEN');
```

## Documentos RPI

- Research (constitution): [../research/012-errores-http/constitution.md](../research/012-errores-http/constitution.md)
- Plan: [../plan/012-errores-http/plan.md](../plan/012-errores-http/plan.md)
- Tasks: [../implementation/012-errores-http/tasks.md](../implementation/012-errores-http/tasks.md)
- Implement: [../implementation/012-errores-http/implement.md](../implementation/012-errores-http/implement.md)
- Prompt origen: [../prompts/2026-11-09_2045_011-012-013-errores-y-autorizacion.md](../prompts/2026-11-09_2045_011-012-013-errores-y-autorizacion.md)

## Specs relacionadas

- depende de: [005-backend-estructura](005-backend-estructura.md) — ubicación en `config/` y `middlewares/`.
- depende de: [007-auth-jwt](007-auth-jwt.md) — reemplaza `AuthenticationError` y el manejo del 401.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — se implementa con TDD.
- relacionada con: [011-rbac](011-rbac.md) — el middleware de autorización lanza `FORBIDDEN`; usará 403 y 404 del mapa.

## Puntos abiertos

- Más tipos (`CONFLICT` 409, `UNPROCESSABLE_ENTITY` 422, `TOO_MANY_REQUESTS` 429): se agregan al mapa cuando un recurso los necesite.
- Detalle de validación en el cuerpo del 400: no definido.

## Estado final (Converge)

Implementado con TDD en `feature/012-errores-http` (workspace `D:\Persona-ws\012-errores-http`): las pruebas se escribieron primero y se confirmó que fallaban (12 pruebas en rojo y 3 archivos sin compilar) antes de implementar. Resultado: 198 pruebas en verde (34 nuevas o migradas), `eslint`, `tsc` y `prettier --check` sin errores.

Implementado:

- `config/http-errors.ts`: `HTTP_ERRORS` (400, 401, 403, 404, 500), `HttpErrorType`, `HttpError` y `httpErrorTypeFromStatus`.
- `error-handler.middleware.ts` único: `HttpError` → su tipo; error con `status` soportado → ese tipo; cualquier otro → 500 (registrado en el log). El cuerpo sale siempre del mapa.
- `not-found`, `authenticate`, `auth.service` y `auth.controller` lanzan `HttpError`. `AuthenticationError` fue eliminado.

Cambios de comportamiento:

- Un **JSON malformado** ahora responde **400** (antes caía en 500).
- El **404** ya no refleja la ruta consultada: `{ "error": "Not Found" }`.

Notas:

- La spec [011-rbac](011-rbac.md) (y la consulta de score) usan `FORBIDDEN` y `NOT_FOUND` de este mapa.
- Las specs [005](005-backend-estructura.md) y [007](007-auth-jwt.md) quedan actualizadas con una nota de evolución.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (005 y 007 con nota de evolución)
- [x] índice `specs/README.md` actualizado
