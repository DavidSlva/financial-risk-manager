# Tasks — 006-modelo-datos

Spec: [../../specs/006-modelo-datos.md](../../specs/006-modelo-datos.md) · Plan: [../../plan/006-modelo-datos/plan.md](../../plan/006-modelo-datos/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor.

- [ ] T1 — `DATA_DIR` en `config/environment.ts` (prueba primero) y documentarla en `backend/README.md`
- [ ] T2 — Tipos `Role`, `User`, `Score`, `Violation` en `models/data.types.ts`
- [ ] T3 — `data-integrity.service.ts`: una prueba y su implementación por regla IR-1…IR-9; acumula todas las violaciones
- [ ] T4 — `data-store.service.ts`: lectura de los tres archivos, caché por `mtimeMs`, recarga y falla cerrada (pruebas con archivos temporales)
- [ ] T5 — `roles.service.ts`, `users.service.ts`, `scores.service.ts`
- [ ] T6 — Carga y validación al arranque en `index.ts` (aborta con todas las violaciones)
- [ ] T7 — `roles.json`, `users.example.json`, `scores.example.json` y `.gitignore` de `users.json` y `scores.json`
- [ ] T8 — Verificación: pruebas, lint, tipos, formato; arranque con datos válidos e inválidos; cambio de `active` sin reiniciar
- [ ] T9 — Converge: spec (estado final), `implement.md`, índice, `CLAUDE.md` y `backend/README.md`
