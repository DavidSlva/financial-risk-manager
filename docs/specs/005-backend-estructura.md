---
id: 005-backend-estructura
title: Estructura del backend (Express, capas y Feature-Driven Separation)
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [003-tooling, 004-pnpm-ci]
related: [001-setup-inicial]
supersedes: []
superseded_by: []
---

# 005-backend-estructura — Estructura del backend

## Resumen

Define el diseño del backend: **Express** como framework (la app es pequeña), una estructura de carpetas por capas con un `README.md` propio que explica la intención de cada una, y la convención de nombres **Feature-Driven Separation** `<recurso>.<capa>.<extensión>`.

## Alcance

**Incluye:** Express, carpetas `config/`, `controllers/`, `middlewares/`, `routes/`, `services/`, `backend/README.md`, esqueleto funcional con un recurso de ejemplo (`health`).
**No incluye:** base de datos, autenticación, tests, scripts de build/arranque (`build`, `start`, `dev`), Dockerfile.

## Requisitos

- RF-1: Framework **Express** (v5).
- RF-2: `backend/README.md` describe la intención de cada carpeta y la convención de nombres.
- RF-3: `src/` es la base. Incluye `index.ts` (arranque) y `app.ts` (construye la aplicación, sin escuchar puerto).
- RF-4: `config/` contiene la configuración y la validación de variables de entorno en `environment.ts`. Es el único lugar que lee `process.env`.
- RF-5: `controllers/` recibe las peticiones HTTP y extrae datos de la request; no contiene lógica de negocio.
- RF-6: `middlewares/` agrupa funciones que actúan en cualquier punto del ciclo de vida de la petición.
- RF-7: `routes/` define las rutas; un enrutador principal (`index.ts`) une los enrutadores de cada recurso.
- RF-8: `services/` es la capa de negocio y no conoce Express.
- RF-9: Nombres de archivo `<recurso>.<capa>.<extensión>` en controllers, routes y services (ej. `health.controller.ts`).

## Diseño

```
backend/src/
├── index.ts
├── app.ts
├── config/environment.ts
├── controllers/health.controller.ts
├── middlewares/{error-handler,not-found}.middleware.ts
├── routes/{index,health.routes}.ts
└── services/health.service.ts
```

Flujo: `route → middlewares → controller → service`. Las rutas cuelgan de `/api`; ejemplo: `GET /api/health`.

La convención completa y la guía para agregar un recurso están en [backend/README.md](../../backend/README.md).

## Documentos RPI

- Research (constitution): [../research/005-backend-estructura/constitution.md](../research/005-backend-estructura/constitution.md)
- Plan: [../plan/005-backend-estructura/plan.md](../plan/005-backend-estructura/plan.md)
- Tasks: [../implementation/005-backend-estructura/tasks.md](../implementation/005-backend-estructura/tasks.md)
- Implement: [../implementation/005-backend-estructura/implement.md](../implementation/005-backend-estructura/implement.md)
- Prompt origen: [../prompts/2026-11-09_1946_005-backend-estructura.md](../prompts/2026-11-09_1946_005-backend-estructura.md)

## Specs relacionadas

- depende de: [003-tooling](003-tooling.md) — lint, formato y `tsc` del código nuevo.
- depende de: [004-pnpm-ci](004-pnpm-ci.md) — Express entra por `pnpm add` bajo la cuarentena de 7 días.
- relacionada con: [001-setup-inicial](001-setup-inicial.md) — creó la carpeta `backend/`.

## Puntos abiertos

- Scripts de `dev`, `build` y `start` del backend, y Dockerfile: spec posterior.
- Pruebas automatizadas (por eso `app.ts` no escucha puerto).
- Nombre de archivo de configuración: se usó `environment.ts` (el prompt decía `enviroment.ts`, interpretado como errata).
- Validación de variables propia y sin dependencias; se puede cambiar por una librería si crece.

## Estado final (Converge)

Implementado en `feature/005-backend-estructura` (workspace `D:\Persona-ws\005-backend-estructura`). Verificado: `eslint`, `tsc` y `prettier --check` pasan. Se compiló el backend a un directorio temporal y se levantó: `GET /api/health` responde `200` con el estado, una ruta inexistente responde `404`, y un `PORT` inválido aborta el arranque con un mensaje claro.

Notas:

- Dependencias nuevas: `express` y `@types/express` (resueltas con la cuarentena de 7 días).
- Al agregar dependencias, `pnpm` reescribió `pnpm-lock.yaml` con su propio formato y `prettier --check` falló. Se corrigió en la spec 004 (commit `fix(004)`, `pnpm-lock.yaml` en `.prettierignore`); esta rama lo incluye.
- Los imports relativos llevan extensión `.js` por `moduleResolution: NodeNext`.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (004 documenta el fix del lockfile)
- [x] índice `specs/README.md` actualizado
