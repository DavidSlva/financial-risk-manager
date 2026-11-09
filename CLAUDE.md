# CLAUDE.md

Monorepo `financial-risk-manager` (https://github.com/DavidSlva/financial-risk-manager).

- `backend/`: Node.js + TypeScript.
- `frontend/`: SPA React + TypeScript con Vite. Producción = bundle estático, minificado y anonimizado.
- `docs/`: toda la documentación. Ver `docs/README.md`.

Definido por: `docs/specs/001-setup-inicial.md`, `docs/specs/002-flujo-git-agentes.md` y `docs/specs/003-tooling.md`.

## Metodología: SDD corto + RPI

Etapas: constitution → specify → plan → tasks → implement → converge.

| Etapa             | Archivo                                                           |
| ----------------- | ----------------------------------------------------------------- |
| Constitution      | `docs/research/<spec-id>/constitution.md`                         |
| Specify           | `docs/specs/<spec-id>.md` (hub: detalle general, enlaza al resto) |
| Plan              | `docs/plan/<spec-id>/plan.md`                                     |
| Tasks / Implement | `docs/implementation/<spec-id>/{tasks,implement}.md`              |

- Ids de spec: `NNN-slug`. Plantillas en `docs/specs/_templates/`.
- Las specs forman un grafo: declarar `depends_on` / `related` en el front matter y reflejarlo en `docs/specs/README.md`.
- **Converge (siempre):** actualizar la spec con el resumen del estado final, revisar que constitution/plan/tasks/implement y las specs relacionadas estén al día, y actualizar el índice.
- **Prompts:** guardar cada prompt del usuario como `docs/prompts/YYYY-MM-DD_HHMM_NNN-slug.md` (hora local, texto textual). Ver `docs/prompts/README.md`.

## Flujo Git (gitflow)

| Rama                 | Ambiente            | Entra desde                  |
| -------------------- | ------------------- | ---------------------------- |
| `main`               | producción          | `staging`                    |
| `staging`            | certificación       | `develop`                    |
| `develop`            | desarrollo          | `feature/*`, `integration/*` |
| `feature/<NNN-slug>` | trabajo de una spec | `develop`                    |

- Una rama por spec, nombrada con el id de la spec: `feature/002-flujo-git-agentes`.
- Los cambios llegan a `develop` por PR. No hacer commits directos en `main`, `staging` ni `develop`.

## Workspaces de agentes

- Cada agente trabaja en su propio workspace (`git worktree`) con su propia rama.
- **Nunca dos workspaces para la misma spec.** Antes de crear uno: `git worktree list` y revisar ramas `feature/<NNN-slug>`.
- Se permiten workspaces de integración (`integration/<slug>`) para combinar cambios antes de promover.

## Versionado y promoción

- Cada commit de promoción lleva un tag anotado `x.y`: `x` = id numérico de la spec, `y` = actualizaciones sobre esa spec (primera promoción = `x.0`).
- `develop → staging`: tag `rcx.y` (ej. `rc2.0`).
- `staging → main`: tag `x.y` sin `rc` (ej. `2.0`).

## Tooling y calidad (spec 003)

- Node **22.22** (`.nvmrc`; `engines` `>=22.22.0 <23` en raíz, `backend` y `frontend`). Usar `nvm use`.
- npm workspaces: `npm install` en la raíz del workspace.
- Comandos: `npm run lint`, `npm run format` / `format:check`, `npm run typecheck`.
- Prettier manda en estilo; ESLint está alineado con él (`eslint-config-prettier`). No reformatear `docs/prompts`.
- Hooks (Husky): `pre-commit` = lint-staged (ESLint + Prettier) y `tsc`; `commit-msg` = Commitlint. No saltarse hooks (`--no-verify`).
- **Commits:** Conventional Commits con el id de la spec como scope: `tipo(NNN): descripción`, ej. `feat(003): agregar tooling`.
- Workspaces de agentes en `D:\Persona-ws\<NNN-slug>` (`git worktree add ../Persona-ws/<NNN-slug> -b feature/<NNN-slug> develop`).

## Reglas para agentes

- Antes de trabajar: identificar la spec, leerla y seguir sus enlaces RPI.
- Trabajar solo dentro del workspace y la rama asignados.
- Acciones hacia el remoto (push, tags, PRs, promociones) requieren confirmación del usuario.
- Cada cambio relevante debe quedar reflejado en la spec correspondiente (Converge).

## Puntos abiertos

Tags en promociones de integración con varias specs, hotfixes y protección de ramas: ver `docs/specs/002-flujo-git-agentes.md`.
