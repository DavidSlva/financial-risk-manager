---
id: 010-tdd-vitest
title: TDD con Vitest (carpeta test/ espejo de src/) e integración en el CI
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [004-pnpm-ci, 005-backend-estructura]
related: [006-modelo-datos, 007-auth-jwt]
supersedes: []
superseded_by: []
---

# 010-tdd-vitest — TDD con Vitest

## Resumen

El proyecto se desarrolla con **TDD**: primero la prueba (falla), luego el código mínimo (pasa), luego se refactoriza. Las pruebas se escriben con **Vitest** y viven en una carpeta `test/` en el backend y en el frontend, con la **misma estructura** que `src/`. El CI las ejecuta.

## Alcance

**Incluye:** Vitest en `backend/` y `frontend/`, carpeta `test/` espejo de `src/`, scripts `test`, configuración de TypeScript, paso de CI, regla TDD en `CLAUDE.md`, pruebas del código existente del backend.
**No incluye:** pruebas de componentes React (requieren entorno DOM; se agregan con la primera pantalla), cobertura mínima obligatoria, pruebas end-to-end.

## Requisitos

- RF-1: **Vitest** en `backend/` y `frontend/` (dependencia de cada workspace; entra por `pnpm add` bajo la cuarentena de 7 días).
- RF-2: Carpeta `test/` en cada workspace con la **misma estructura que `src/`**: `src/services/x.service.ts` → `test/services/x.service.test.ts`.
- RF-3: Nombre de archivo `<recurso>.<capa>.test.ts` (convención de la spec 005 más el sufijo `.test`).
- RF-4: Scripts: `test` (`vitest run`) y `test:watch` en cada workspace; `pnpm run test` en la raíz las ejecuta todas.
- RF-5: `tsc` y ESLint también cubren `test/` y `vitest.config.ts`.
- RF-6: El **CI** ejecuta `pnpm run test` (paso "Pruebas (Vitest)"), después de `tsc`.
- RF-7: Proceso TDD documentado en `CLAUDE.md`: prueba que falla → implementación → refactor; las pruebas se escriben antes que el código.
- RF-8: El frontend usa `passWithNoTests` mientras no tenga código en `src/`; la opción se retira cuando aparezca la primera prueba.

## Diseño

```
backend/
├── src/…
├── test/                    # espejo de src/
│   ├── app.test.ts
│   ├── config/environment.test.ts
│   └── services/health.service.test.ts
└── vitest.config.ts
frontend/
├── src/…
├── test/                    # espejo de src/ (vacío por ahora)
└── vitest.config.ts
```

- Las pruebas importan desde `../src/...` con extensión `.js` (NodeNext; Vite lo resuelve a `.ts`).
- Las pruebas HTTP levantan `createApp()` en un puerto efímero y usan `fetch` (sin librerías adicionales).
- Vitest sin globales: se importa `describe`, `it`, `expect` desde `vitest`.

## Documentos RPI

- Research (constitution): [../research/010-tdd-vitest/constitution.md](../research/010-tdd-vitest/constitution.md)
- Plan: [../plan/010-tdd-vitest/plan.md](../plan/010-tdd-vitest/plan.md)
- Tasks: [../implementation/010-tdd-vitest/tasks.md](../implementation/010-tdd-vitest/tasks.md)
- Implement: [../implementation/010-tdd-vitest/implement.md](../implementation/010-tdd-vitest/implement.md)
- Prompt origen: [../prompts/2026-11-09_2013_010-tdd-vitest.md](../prompts/2026-11-09_2013_010-tdd-vitest.md)

## Specs relacionadas

- depende de: [004-pnpm-ci](004-pnpm-ci.md) — CI y política de dependencias.
- depende de: [005-backend-estructura](005-backend-estructura.md) — la estructura de `src/` que `test/` replica.
- relacionada con: [006-modelo-datos](006-modelo-datos.md) y [007-auth-jwt](007-auth-jwt.md) — se implementan con TDD sobre esta base.

## Puntos abiertos

- Entorno DOM (`jsdom` o `happy-dom`) y Testing Library para el frontend: con la primera pantalla.
- Cobertura mínima y reporte en el CI.
- Ejecutar las pruebas también en `pre-commit`: hoy solo en el CI.

## Estado final (Converge)

Implementado en `feature/010-tdd-vitest` (workspace `D:\Persona-ws\010-tdd-vitest`). Vitest 5.1.0 en backend y frontend. El backend tiene 13 pruebas en 3 archivos (configuración, servicio `health`, aplicación HTTP) y pasan; el frontend no tiene pruebas todavía y termina con código 0. `eslint`, `tsc` y `prettier --check` pasan. La instalación de Vitest no necesitó scripts de ciclo de vida: `allowBuilds` sigue vacío.

Notas:

- Las pruebas del código existente (spec 005) se escribieron **después** del código; son la base. Desde la 006 se aplica TDD estricto.
- El paso de CI se ejecutó en GitHub (converge): run 42720950711 en `develop`, "Pruebas (Vitest)" en verde.
- Esta rama parte de `feature/005-backend-estructura`; las specs 006 y 007 la integran.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (004 y 005 documentadas; 006 y 007 enlazan a 010)
- [x] índice `specs/README.md` actualizado
