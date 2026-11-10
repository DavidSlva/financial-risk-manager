# Tasks — 016-score-consulta

Spec: [../../specs/016-score-consulta.md](../../specs/016-score-consulta.md) · Plan: [../../plan/016-score-consulta/plan.md](../../plan/016-score-consulta/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor.

- [x] T1 — `rut`, `format-score-date`, `score.types`, `score-errors` y `score.client` con sus pruebas · verificación: `pnpm run test` (commit `f5d7188`)
- [x] T2 — Textos `score.*` en español (`es.json`) con prueba de llaves · verificación: `score-i18n.test.ts` (commit `cc92e21`)
- [x] T3 — `ScoreResult`, `ScorePage` y `score.css` (tokens en `styles.config.ts`) · verificación: pruebas de componente, de página y de CSS sin literales (commit `cc92e21`)
- [ ] T4 — Diferida: montar `ScorePage` en `App` con la sesión en memoria, conectar `onSessionExpired` (401 hacia login) e `initialRut`; depende de la spec 015
- [ ] T5 — Diferida: scripts Playwright e2e en `frontend/e2e/` (flujo feliz, 403, 404, 400, 401, 500, red caída; 390 y 1280 px)
- [ ] T6 — Diferida: reconciliar la respuesta real del backend con la spec 013 (campo `fecha` y formato del `rut`)
- [ ] T7 — Pendiente de la revisión final: ver hallazgos menores en [implement.md](implement.md)
- [ ] T8 — Converge final: spec, índice, `CLAUDE.md` y `frontend/README.md` (hoy solo parcial)
