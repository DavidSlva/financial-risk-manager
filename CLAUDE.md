# CLAUDE.md

Monorepo `financial-risk-manager` (https://github.com/DavidSlva/financial-risk-manager).

- `backend/`: Node.js + TypeScript.
- `frontend/`: SPA React + TypeScript con Vite. Producción = bundle estático, minificado y anonimizado.
- `docs/`: toda la documentación. Ver `docs/README.md`.

Definido por: `docs/specs/001-setup-inicial.md`, `002-flujo-git-agentes.md`, `003-tooling.md`, `004-pnpm-ci.md`, `005-backend-estructura.md`, `010-tdd-vitest.md`, `006-modelo-datos.md` `007-auth-jwt.md` y `012-errores-http.md`.

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
- **Converge (siempre):** actualizar la spec con el resumen del estado final, revisar que constitution/plan/tasks/implement y las specs relacionadas estén al día, y actualizar el índice (`pnpm run docs:index` regenera relaciones y grafo desde el front matter; `pnpm run docs:index:check` los verifica). Contrastar lo documentado con la realidad (CI, git, pruebas); las horas de `implement.md` salen de `date` o de git, nunca se estiman.
- **Prompts:** guardar **cada** prompt del usuario (también las confirmaciones y órdenes de push, merge, promoción o converge) como `docs/prompts/YYYY-MM-DD_HHMM_NNN-slug.md` (hora local, texto textual). Ver `docs/prompts/README.md`.

## Flujo Git (gitflow)

| Rama                 | Ambiente            | Entra desde                  |
| -------------------- | ------------------- | ---------------------------- |
| `main`               | producción          | `staging`                    |
| `staging`            | certificación       | `develop`                    |
| `develop`            | desarrollo          | `feature/*`, `integration/*` |
| `feature/<NNN-slug>` | trabajo de una spec | `develop`                    |

- Una rama por spec, nombrada con el id de la spec: `feature/002-flujo-git-agentes`.
- Los cambios llegan a `develop` por PR. No hacer commits directos en `main`, `staging` ni `develop`. (Hasta ahora las ramas se integraron con merge `--no-ff` sin PR, a pedido del usuario; ver puntos abiertos de la spec 002.)

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
- Gestor: **pnpm** (versión en `packageManager`; workspaces en `pnpm-workspace.yaml`). `pnpm install` en la raíz del workspace. No usar npm ni yarn.
- Comandos: `pnpm run lint`, `pnpm run format` / `format:check`, `pnpm run typecheck`, `pnpm run check:policy`.
- Prettier manda en estilo; ESLint está alineado con él (`eslint-config-prettier`). No reformatear `docs/prompts`.
- Hooks (Husky): `pre-commit` = lint-staged (ESLint + Prettier) y `tsc`; `commit-msg` = Commitlint. No saltarse hooks (`--no-verify`).
- **Commits:** Conventional Commits con el id de la spec como scope: `tipo(NNN): descripción`, ej. `feat(003): agregar tooling`.
- Workspaces de agentes en `D:\Persona-ws\<NNN-slug>` (`git worktree add ../Persona-ws/<NNN-slug> -b feature/<NNN-slug> develop`).

## Cadena de suministro y CI (spec 004)

- Política en `pnpm-workspace.yaml`, verificada por `scripts/check-pnpm-policy.mjs`:
  - `allowBuilds` **vacío**: ninguna dependencia ejecuta scripts de ciclo de vida. No agregar entradas sin una spec.
  - Cuarentena de **7 días** (`minimumReleaseAge: 10080`, `minimumReleaseAgeStrict: true`). Sin `minimumReleaseAgeExclude`.
  - `blockExoticSubdeps: true` (sin git/tarball por URL en dependencias transitivas).
- Agregar dependencias solo con `pnpm add` (resuelve versiones maduras). Si la cuarentena bloquea una versión, esperar o elegir otra; no debilitar la política.
- CI (`.github/workflows/ci.yml`, GitHub Actions): política, `pnpm install --frozen-lockfile`, Prettier **solo valida**, ESLint, `tsc` y Commitlint (en PR). Acciones fijadas por SHA con al menos 7 días de publicadas.

## Backend (spec 005)

- Express 5 + TypeScript. Estructura y convenciones en `backend/README.md` (leerlo antes de tocar el backend).
- `src/`: `config/` (único lugar que lee `process.env`: `environment.ts`), `controllers/`, `middlewares/`, `routes/` (enrutador principal en `index.ts`), `services/`.
- Nombres **Feature-Driven Separation**: `<recurso>.<capa>.ts` (ej. `health.controller.ts`, `health.routes.ts`, `health.service.ts`).
- Flujo: route → middlewares → controller → service. Los controladores no llevan negocio; los servicios no importan Express.
- Imports relativos con extensión `.js` (NodeNext).

## TDD y pruebas (spec 010)

- Se trabaja con **TDD**: escribir primero la prueba y verla fallar, luego el código mínimo para que pase, luego refactorizar. No se escribe código de producción sin una prueba que lo pida.
- Ejecutor: **Vitest**. `pnpm run test` (todas), `pnpm --filter <workspace> run test:watch`.
- Las pruebas viven en `backend/test/` y `frontend/test/`, con la **misma estructura que `src/`** y nombre `<recurso>.<capa>.test.ts` (ej. `src/services/health.service.ts` → `test/services/health.service.test.ts`).
- Imports desde las pruebas: `../src/...js` (con extensión `.js`). Sin globales de Vitest: importar `describe`, `it`, `expect`.
- Pruebas HTTP: `createApp()` en un puerto efímero con `fetch`; sin librerías adicionales.
- El CI ejecuta las pruebas; un PR con pruebas en rojo no se integra.

## Modelo de datos (spec 006)

- Sin base de datos: `backend/data/{roles,users,scores}.json`. Modelo y función de cada columna en `docs/specs/006-modelo-datos.md`.
- `roles` es una tabla propia (extensible); `users.role` es FK a `roles.name`; `scores.rut` es PK y FK a `users.rut`. `users.active` es la marca de vigencia (revocación).
- La integridad se valida con `validateIntegrity` (función pura, reglas IR-1…IR-9) al arrancar y al recargar; ante datos inválidos se falla cerrado.
- `users.json` y `scores.json` contienen datos personales: **nunca** se versionan (solo los `*.example.json`).
- Se leen los datos solo con `users.service`, `roles.service` y `scores.service`; no leer los archivos directamente.

## Seguridad y autenticación (spec 007)

- JWT **simétrico**. `JWT_SECRET` = 64 bytes de `crypto.randomBytes(64)` en hexadecimal (128 caracteres); se genera con `pnpm --filter @financial-risk-manager/backend run generate-secret`. **Nunca** se escribe en el repositorio, en logs ni en mensajes de error.
- El **algoritmo**, la clave y los TTL (`JWT_ALGORITHM`, `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS`) viven solo en `config/environment.ts`. Solo HS256/HS384/HS512; al verificar se acepta únicamente el configurado.
- **El access autentica; el refresh no.** Cada token lleva `typ` y se verifica en ambos sentidos: un refresh no pasa por `authenticate.middleware` y un access no refresca.
- **Revocación:** toda validación pasa por `auth.service` (`authenticateAccess`, `refreshAccess`), que tras verificar el token comprueba en `users.json` que el usuario exista y esté `active`. No validar tokens saltándose `auth.service`.
- El rol se toma de `users.json` en cada petición, no del token (el token no lleva rol).
- Rechazos: `401` genérico con `WWW-Authenticate: Bearer`; nunca indicar si falló la firma, la expiración o la vigencia.
- Rutas protegidas: `router.get(..., authenticate, controller)`; el usuario queda en `req.user`.
- Emisión del primer par de tokens (login): pendiente, spec 009. La autorización por rol: pendiente, spec 011.

## Errores HTTP (spec 012)

- Los errores HTTP soportados viven en el mapa `backend/src/config/http-errors.ts` (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`). Rutas, controladores, servicios y middlewares lanzan `throw new HttpError('<TIPO>')`.
- Hay **un único** `error-handler.middleware`; **no** crear middlewares ni clases de error por tipo. Un tipo nuevo es una entrada nueva en el mapa.
- Nunca armar `res.status(4xx).json(...)` a mano para errores. El mensaje al cliente sale del mapa, nunca del detalle interno.

## Reglas para agentes

- Antes de trabajar: identificar la spec, leerla y seguir sus enlaces RPI.
- Trabajar solo dentro del workspace y la rama asignados.
- Acciones hacia el remoto (push, tags, PRs, promociones) requieren confirmación del usuario.
- Cada cambio relevante debe quedar reflejado en la spec correspondiente (Converge).

## Puntos abiertos

Tags en promociones de integración con varias specs, hotfixes y protección de ramas: ver `docs/specs/002-flujo-git-agentes.md`.
