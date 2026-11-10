# Tasks — 014-cors-desarrollo

Spec: [../../specs/014-cors-desarrollo.md](../../specs/014-cors-desarrollo.md) · Plan: [../../plan/014-cors-desarrollo/plan.md](../../plan/014-cors-desarrollo/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor.

- [x] T1 — `config/environment.ts`: `PORT` por defecto 8000 y `CORS_ORIGINS` (valores por defecto por `NODE_ENV`, validación de cada origen, sin duplicados)
- [x] T2 — `cors.middleware.ts`: `createCors(origins)` (origen permitido, no permitido, preflight, sin `Origin`, lista vacía, `Vary`)
- [x] T3 — `app.ts`: `createApp({ corsOrigins })` con el middleware primero; pruebas de la aplicación
- [x] T4 — Verificación: pruebas, lint, tipos, formato; servidor real con `curl` (preflight y petición con `Origin`)
- [x] T5 — Converge: spec (estado final), `implement.md`, índice, `backend/README.md` y `CLAUDE.md`
