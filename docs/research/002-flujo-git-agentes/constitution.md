# Constitution — 002-flujo-git-agentes
Spec: [../../specs/002-flujo-git-agentes.md](../../specs/002-flujo-git-agentes.md)

## Principios y restricciones
- Gitflow con tres ambientes: `develop` (desarrollo), `staging` (certificación), `main` (producción).
- Ramas de spec: `feature/<NNN-slug>`.
- Un agente = un workspace = una rama. Jamás dos workspaces para la misma spec.
- Se permiten workspaces de integración.
- Todo commit de promoción lleva tag `x.y` (x = id de spec, y = actualizaciones). `rc` solo en `develop → staging`.
- `CLAUDE.md` es la entrada de reglas para los agentes.

## Contexto investigado
- Repositorio: https://github.com/DavidSlva/financial-risk-manager
- Los workspaces se implementan con `git worktree` (cada worktree exige una rama distinta, lo que refuerza la regla de unicidad).

## Preguntas abiertas
Ver "Puntos abiertos" en la spec (primer `y`, tags en integración, hotfix, protección de ramas).
