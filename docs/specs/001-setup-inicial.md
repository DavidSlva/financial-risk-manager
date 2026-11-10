---
id: 001-setup-inicial
title: Setup inicial del monorepo y metodología
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: []
related: [002-flujo-git-agentes, 003-tooling, 005-backend-estructura]
supersedes: []
superseded_by: []
---

# 001-setup-inicial — Setup inicial del monorepo y metodología

## Resumen

Crear el esqueleto del monorepo (backend Node/TS, frontend React/TS con Vite) y la estructura de documentación para trabajar con SDD corto + RPI.

## Alcance

**Incluye:** carpetas base `backend/`, `frontend/`, `docs/` (specs, research, plan, implementation, prompts), plantillas y READMEs.
**No incluye:** configuración de herramientas (package.json, tsconfig, Vite, linting). Será otra spec.

## Requisitos

- RF-1: Carpetas `backend/` y `frontend/`.
- RF-2: `docs/` con `research`, `plan`, `implementation`, `specs`, `prompts`.
- RF-3: Specs con índice a documentos RPI y relaciones entre specs (grafo).
- RF-4: Historial de prompts con fecha y hora.

## Criterios de aceptación

- [x] Estructura de carpetas creada
- [x] Plantillas de spec/constitution/plan/tasks/implement
- [x] Prompt inicial registrado

## Documentos RPI

- Research (constitution): [../research/001-setup-inicial/constitution.md](../research/001-setup-inicial/constitution.md)
- Plan: [../plan/001-setup-inicial/plan.md](../plan/001-setup-inicial/plan.md)
- Tasks: [../implementation/001-setup-inicial/tasks.md](../implementation/001-setup-inicial/tasks.md)
- Implement: [../implementation/001-setup-inicial/implement.md](../implementation/001-setup-inicial/implement.md)
- Prompt origen: [../prompts/2026-11-09_1901_001-setup-inicial.md](../prompts/2026-11-09_1901_001-setup-inicial.md)

## Specs relacionadas

- relacionada con: [002-flujo-git-agentes](002-flujo-git-agentes.md) — define el flujo Git y `CLAUDE.md` (nodo raíz del grafo).
- relacionada con: [003-tooling](003-tooling.md) — tooling de calidad.
- relacionada con: [005-backend-estructura](005-backend-estructura.md) — estructura de la carpeta `backend/`.

## Estado final (Converge)

Estructura creada tal como se especificó. Se añadió `docs/README.md` con la metodología y plantillas en `specs/_templates/`. El tooling lo definió la spec [003-tooling](003-tooling.md) (y [004-pnpm-ci](004-pnpm-ci.md) migró a pnpm); la estructura del backend, la spec [005-backend-estructura](005-backend-estructura.md).

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (ninguna)
- [x] índice `specs/README.md` actualizado
