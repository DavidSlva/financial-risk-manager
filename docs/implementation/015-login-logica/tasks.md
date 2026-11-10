# Tasks — 015-login-logica

Spec: [../../specs/015-login-logica.md](../../specs/015-login-logica.md) · Plan: [../../plan/015-login-logica/plan.md](../../plan/015-login-logica/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor.

## Implementado

- [x] T1 — Spec, plan y constitution (commits `f33074c`, `38fc1fe`)
- [x] T2 — Núcleo del login: `lib/rut.ts`, `config/login-limits.ts`, `lib/validate-login.ts`, `config/login-errors.ts`, `config/api.config.ts`, `api/login.client.ts` (commit `2e26c34`)
- [x] T3 — Integración con la interfaz: `LoginPage`, `App` con sesión en memoria, `ScorePlaceholder` y aviso de sesión expirada (commit `91f6407`)

## Diferido

- [ ] D1 — Playwright e2e del flujo (`page.route` de `/api/auth/login`), cuando la infraestructura e2e de 014 esté integrada
- [ ] D2 — Prueba manual contra el backend real (usuario de ejemplo; cookies `HttpOnly`)
- [ ] D3 — Cierre de sesión (el backend no tiene `logout`)
- [ ] D4 — Recuperar la sesión al recargar (requiere un endpoint tipo `/api/auth/me`)
- [ ] D5 — Unificar `lib/rut.ts` con la rama 016
- [ ] D6 — Resolver el número 014 duplicado (`014-login-ui` y `014-cors-desarrollo`)
- [ ] D7 — Hallazgos menores de la revisión final (ver el estado final de la spec)
