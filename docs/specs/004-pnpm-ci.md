---
id: 004-pnpm-ci
title: pnpm, política de cadena de suministro y CI en GitHub
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [003-tooling]
related: [002-flujo-git-agentes, 010-tdd-vitest]
supersedes: []
superseded_by: []
---

# 004-pnpm-ci — pnpm, cadena de suministro y CI

## Resumen

Migra el monorepo de npm a **pnpm**, fija una política de cadena de suministro (sin scripts de ciclo de vida, cuarentena de 7 días, fuentes ocultas bloqueadas) y agrega un **CI en GitHub Actions** que repite las validaciones de los hooks más las de pnpm.

## Alcance

**Incluye:** pnpm + `pnpm-workspace.yaml`, política de cadena de suministro, script de verificación de la política, workflow de CI, ajuste de hooks y `CLAUDE.md`.
**No incluye:** protección de ramas y checks requeridos en GitHub, Dependabot/Renovate, despliegues (CD).

## Requisitos

- RF-1: Gestor **pnpm**, versión fijada en `packageManager` (`pnpm@12.17.0`). Se elimina `package-lock.json`.
- RF-2: **Sin scripts de ciclo de vida** de dependencias: `allowBuilds: {}` (vacío) y `strictDepBuilds: true`. No hay paquetes aprobados.
- RF-3: **Cuarentena de 7 días**: `minimumReleaseAge: 10080` (minutos) y `minimumReleaseAgeStrict: true`, de modo que ningún paquete nuevo entra si no tiene al menos 7 días, ni siquiera como fallback. No hay `minimumReleaseAgeExclude`.
- RF-4: **Fuentes ocultas bloqueadas**: `blockExoticSubdeps: true` (las dependencias transitivas no pueden venir de git ni de tarballs por URL).
- RF-5: **CI** en GitHub Actions (`.github/workflows/ci.yml`) sobre PR y push a `develop`, `staging` y `main`, con las mismas validaciones que los hooks:
  - Prettier **solo valida** (`format:check`), nunca modifica; falla si algo no está formateado.
  - ESLint (sin `--fix`), `tsc` en ambos workspaces y Commitlint sobre los commits del PR.
- RF-6: El CI agrega las validaciones de pnpm: verificación de la política (`scripts/check-pnpm-policy.mjs`) e instalación con `--frozen-lockfile`, que aplica cuarentena, bloqueo de fuentes ocultas y de scripts.
- RF-7: Acciones de terceros fijadas por **SHA de commit** y con al menos 7 días de publicadas (misma regla de cuarentena). Permisos mínimos (`contents: read`).

## Política vs. versiones

La cuarentena rechazó versiones de hace menos de 7 días durante la migración, por ejemplo `typescript-eslint@8.72.2` y `pnpm@12.18.0`. Por eso se usan `pnpm@12.17.0` y `pnpm/action-setup@v6.1.0` (la v6.1.1 tenía 6 días).
TypeScript se fija en `~6.0.0`: la versión 7 (la que resolvió pnpm) no cumple el peer de `typescript-eslint` (`<6.1.0`).

## Documentos RPI

- Research (constitution): [../research/004-pnpm-ci/constitution.md](../research/004-pnpm-ci/constitution.md)
- Plan: [../plan/004-pnpm-ci/plan.md](../plan/004-pnpm-ci/plan.md)
- Tasks: [../implementation/004-pnpm-ci/tasks.md](../implementation/004-pnpm-ci/tasks.md)
- Implement: [../implementation/004-pnpm-ci/implement.md](../implementation/004-pnpm-ci/implement.md)
- Prompt origen: [../prompts/2026-11-09_1929_004-pnpm-ci.md](../prompts/2026-11-09_1929_004-pnpm-ci.md)

## Specs relacionadas

- depende de: [003-tooling](003-tooling.md) — herramientas de calidad que este spec migra a pnpm y replica en CI.
- relacionada con: [002-flujo-git-agentes](002-flujo-git-agentes.md) — ramas y ambientes sobre los que corre el CI.
- relacionada con: [010-tdd-vitest](010-tdd-vitest.md) — agrega las pruebas al CI.

## Puntos abiertos

- Marcar el job `Validar` como check requerido en `develop`, `staging` y `main` (configuración en GitHub).
- Dependabot/Renovate con `cooldown` de 7 días para mantener la política al actualizar.
- La rama se creó desde `feature/003-tooling` porque la 003 aún no está en `develop`: la 004 debe integrarse después de la 003.

## Estado final (Converge)

Implementado en `feature/004-pnpm-ci` (workspace `D:\Persona-ws\004-pnpm-ci`). Verificado localmente: instalación limpia con `--frozen-lockfile`, `check:policy`, `format:check`, `eslint .` y `tsc` pasan; el script de política falla con una configuración debilitada (edad menor, `blockExoticSubdeps: false`, `allowBuilds` con entradas). La cuarentena se comprobó en vivo al bloquear versiones recientes.

**Verificado en GitHub (converge):** la primera ejecución del CI fue en `develop` (run 42720950711, 2026-11-09 20:30 -03) y pasó todos los pasos; Commitlint se omite en push y solo corre en PR.

Evolución posterior: `pnpm-lock.yaml` quedó excluido de Prettier (commit `fix(004)`; pnpm lo reescribe con su propio formato) y la spec [010](010-tdd-vitest.md) agregó el paso "Pruebas (Vitest)" al workflow.

Notas:

- pnpm se instaló globalmente en el equipo (`npm i -g pnpm@12.17.0`) para que los hooks de Husky lo encuentren.
- Los hooks ahora usan `pnpm exec`.
- En CI `HUSKY=0` evita registrar hooks.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (003 actualizada; 002 enlaza a 004)
- [x] índice `specs/README.md` actualizado
