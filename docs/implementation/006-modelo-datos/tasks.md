# Tasks — 006-modelo-datos

Spec: [../../specs/006-modelo-datos.md](../../specs/006-modelo-datos.md) · Plan: [../../plan/006-modelo-datos/plan.md](../../plan/006-modelo-datos/plan.md)

- [ ] T1 — `DATA_DIR` en `config/environment.ts` (validación y valor por defecto) y documentarla en `backend/README.md`
- [ ] T2 — Tipos `User`, `Score`, `Violation`
- [ ] T3 — `data-integrity.service.ts`: `validateIntegrity` con IR-1…IR-9, acumulando todas las violaciones
- [ ] T4 — Pruebas de `validateIntegrity`, una por regla (decidir ejecutor de pruebas: ver puntos abiertos de la spec 007)
- [ ] T5 — `data-store.service.ts`: lectura, caché por `mtimeMs`, recarga y falla cerrada
- [ ] T6 — `users.service.ts` y `scores.service.ts`
- [ ] T7 — Carga y validación al arranque en `index.ts` (aborta con todas las violaciones)
- [ ] T8 — `users.example.json`, `scores.example.json` y `.gitignore` de los datos reales
- [ ] T9 — Verificación: lint, tipos, formato; arranque con datos válidos e inválidos; cambio de `active` sin reiniciar
- [ ] T10 — Converge: actualizar la spec (estado final), `implement.md`, índice, `CLAUDE.md` y `backend/README.md`
