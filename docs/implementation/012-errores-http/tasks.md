# Tasks — 012-errores-http

Spec: [../../specs/012-errores-http.md](../../specs/012-errores-http.md) · Plan: [../../plan/012-errores-http/plan.md](../../plan/012-errores-http/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor.

- [x] T1 — `config/http-errors.ts`: `HTTP_ERRORS`, `HttpErrorType`, `HttpError`, `httpErrorTypeFromStatus`
- [x] T2 — `error-handler.middleware.ts` único, basado en el mapa (incluye `status` de librerías)
- [x] T3 — `not-found.middleware.ts` sobre el mapa; 404 uniforme
- [x] T4 — Migrar `auth.service`, `authenticate.middleware` y `auth.controller` a `HttpError`; eliminar `AuthenticationError`
- [x] T5 — Migrar las pruebas existentes (auth, authenticate, error-handler, app) y agregar el caso de JSON malformado → 400
- [x] T6 — Verificación: pruebas, lint, tipos, formato
- [x] T7 — Converge: spec (estado final), `implement.md`, índice, `CLAUDE.md` y `backend/README.md`
