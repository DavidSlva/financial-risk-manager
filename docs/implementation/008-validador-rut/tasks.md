# Tasks — 008-validador-rut

Spec: [../../specs/008-validador-rut.md](../../specs/008-validador-rut.md) · Plan: [../../plan/008-validador-rut/plan.md](../../plan/008-validador-rut/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor.

- [ ] T1 — `rut.service.ts`: `isValidRut` con la tabla de casos de la spec (incluye DV `0` y `K`)
- [ ] T2 — `data-integrity.service`: IR-13 sobre `users.rut` y `scores.rut` (sin violaciones en cascada)
- [ ] T3 — Migrar los fixtures de pruebas a RUT válidos (los actuales ya lo son; verificar los que usan valores sueltos)
- [ ] T4 — `scores.controller`: validar `:rut` con `isValidRut` → 400, después de `authenticate` y `authorize`
- [ ] T5 — Pruebas HTTP del orden 401 → 403 → 400 → 404 en `GET /api/scores/:rut`
- [ ] T6 — Verificación: pruebas, lint, tipos, formato; arranque real con un RUT inválido en los datos (debe abortar)
- [ ] T7 — Converge: spec (estado final), `implement.md`, índice, specs 006 y 013 (nota de evolución), `CLAUDE.md` y `backend/README.md`
