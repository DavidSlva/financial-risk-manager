# Tasks — 014-login-ui

Spec: [../../specs/014-login-ui.md](../../specs/014-login-ui.md) · Plan: [../../plan/014-login-ui/plan.md](../../plan/014-login-ui/plan.md)

- [x] T1 — Andamiaje de Vite, React, i18next y entorno de pruebas (jsdom, Testing Library) · commit `d535e7e` · verificación: `build`, `test`, `typecheck`, `check:policy`
- [x] T2 — Configuración de estilos (`styles.config.ts`) y `applyStyleTokens` · commit `3428fde` · verificación: pruebas de publicación de variables
- [x] T3 — i18next y textos en español (`i18n/es.json`) · commit `0fabe8d` · verificación: pruebas de llaves
- [x] T4 — Componentes `Button`, `TextField` y `PasswordField` · commit `3adbdc4` · verificación: pruebas de componentes y de texto literal
- [x] T5 — `LoginForm`, `LoginPage`, estilos y arranque · commits `7d0d979`, `2624069` (corrección 1), `0d41e1f` (corrección 2) · verificación: pruebas de estados, CSS sin literales
- [x] T6 — Vista previa de estados solo para desarrollo (`/dev/login-states`) · commit `e827904` · verificación: pruebas de la vista previa
- [x] T7 — Scripts Playwright del diseño · commit `5709518` · verificación: `test:e2e`
- [x] T7b — Tema claro con contraste AA verificado (decisión del usuario) · commit `f73cbff` · verificación: `styles.contrast.test.ts`, `test:e2e` (44 pruebas)
- [x] T8 — Converge, documentación y CI · commit `docs(014): converge de la spec del login ui` · verificación: `docs:index:check`, `format:check`

Previo: spec, plan y constitution en `7339b2c`.
