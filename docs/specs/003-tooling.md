---
id: 003-tooling
title: Tooling de calidad (Node, Prettier, ESLint, tsc, Commitlint, hooks)
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [001-setup-inicial, 002-flujo-git-agentes]
related: [004-pnpm-ci]
supersedes: []
superseded_by: []
---

# 003-tooling — Tooling de calidad

## Resumen

Fija la versión de Node y configura la calidad de código del monorepo: formateo (Prettier), lint (ESLint alineado con Prettier), chequeo de tipos (`tsc`) y validación de mensajes de commit (Commitlint), todo ejecutado por hooks de git.

## Alcance

**Incluye:** `.nvmrc`, `engines`, npm workspaces, Prettier, ESLint, `tsconfig` base/back/front, Husky + lint-staged, Commitlint, `.gitattributes`/`.gitignore`/`.npmrc`.
**No incluye:** instalación de React/Vite ni de librerías del backend, tests, CI, scripts de build. Serán specs posteriores.

## Requisitos

- RF-1: Node **22.22** fijado en `.nvmrc` y en `engines` de `package.json` (raíz, `backend`, `frontend`): `>=22.22.0 <23`. `engine-strict=true`.
- RF-2: Monorepo con workspaces (`backend`, `frontend`). _Gestor actualizado de npm a pnpm en la spec [004](004-pnpm-ci.md)._
- RF-3: **Prettier** define formato y estilo (`.prettierrc.json`). Los prompts de `docs/prompts` se excluyen para conservarlos textuales.
- RF-4: **ESLint** (flat config, `typescript-eslint`) con `eslint-config-prettier` al final, para no chocar con Prettier.
- RF-5: **tsc** `--noEmit` por workspace, con `tsconfig.base.json` en modo `strict`.
- RF-6: **Commitlint** extiende `@commitlint/config-conventional` y agrega una única regla propia: el **scope es el id numérico (3 dígitos) de la spec**, ej. `feat(003): agregar tooling`.
- RF-7: Hook `pre-commit`: lint-staged (ESLint `--fix` + Prettier sobre archivos staged) y luego `tsc` en ambos workspaces. Hook `commit-msg`: Commitlint.

## Convención de commits

`tipo(NNN): descripción` — `tipo` según Conventional Commits (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`, …) y `NNN` = id de la spec.

Los commits de merge (promociones) los ignora Commitlint por defecto.

## Documentos RPI

- Research (constitution): [../research/003-tooling/constitution.md](../research/003-tooling/constitution.md)
- Plan: [../plan/003-tooling/plan.md](../plan/003-tooling/plan.md)
- Tasks: [../implementation/003-tooling/tasks.md](../implementation/003-tooling/tasks.md)
- Implement: [../implementation/003-tooling/implement.md](../implementation/003-tooling/implement.md)
- Prompt origen: [../prompts/2026-11-09_1920_003-tooling.md](../prompts/2026-11-09_1920_003-tooling.md)

## Specs relacionadas

- depende de: [001-setup-inicial](001-setup-inicial.md) — estructura del monorepo.
- depende de: [002-flujo-git-agentes](002-flujo-git-agentes.md) — flujo Git; la rama es `feature/003-tooling`.
- relacionada con: [004-pnpm-ci](004-pnpm-ci.md) — migra a pnpm y agrega la política de cadena de suministro y el CI.

## Estado final (Converge)

Implementado en `feature/003-tooling` (workspace `D:\Persona-ws\003-tooling`). Verificado: `eslint .`, `tsc` en ambos workspaces y `prettier --check .` pasan sin errores; Commitlint acepta `feat(003): ok` y `fix(002): x` y rechaza mensajes sin scope, con scope no numérico o sin formato convencional. Se formatearon con Prettier los documentos existentes y se agregó `.gitattributes` (`eol=lf`) que resuelve los avisos LF/CRLF de la spec 002.

Notas:

- `backend/src/index.ts` y `frontend/src/main.tsx` son placeholders vacíos; `tsc` necesita al menos un archivo de entrada.
- Husky fija `core.hooksPath` en la config compartida del repositorio, por lo que aplica a todos los workspaces una vez que la rama tenga `.husky/`.
- Versiones instaladas: ESLint 10, TypeScript 6, Prettier 3, Commitlint 21 (ver `package-lock.json`).
- Pendiente: probar los hooks en un commit real (el commit de esta spec los ejercita).

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (001 y 002 enlazan a 003; `CLAUDE.md` actualizado)
- [x] índice `specs/README.md` actualizado
