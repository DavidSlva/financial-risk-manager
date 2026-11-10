# Tasks — 013-consulta-score

Spec: [../../specs/013-consulta-score.md](../../specs/013-consulta-score.md) · Plan: [../../plan/013-consulta-score/plan.md](../../plan/013-consulta-score/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor.

- [x] T1 — `scores.service.ts`: `canGetScore` (callback de autorización) con su matriz de pruebas
- [x] T2 — `scores.controller.ts`: `getScore` (404 si no hay score)
- [x] T3 — `scores.routes.ts` y registro en `routes/index.ts`
- [x] T4 — Pruebas HTTP de extremo a extremo con tokens reales (tabla de decisión completa)
- [x] T5 — Verificación: pruebas, lint, tipos, formato; servidor real con tokens
- [x] T6 — Converge: spec (estado final), `implement.md`, índice, enlaces desde 011 y 012, `CLAUDE.md` y `backend/README.md`
- [x] T7 — Respuesta con rut formateado y `consulted_at` (UTC); `formatRut`; reloj inyectable
- [x] T8 — IR-9 a 0–100 (datos, fixtures, ejemplo) y converge de 006 y 013
