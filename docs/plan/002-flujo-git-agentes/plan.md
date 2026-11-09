# Plan — 002-flujo-git-agentes
Spec: [../../specs/002-flujo-git-agentes.md](../../specs/002-flujo-git-agentes.md)

## Enfoque
Documentar el flujo en la spec y volcarlo en un `CLAUDE.md` conciso y operativo. No se ejecutan comandos git en esta spec.

## Decisiones técnicas
| Decisión | Alternativas | Motivo |
|----------|--------------|--------|
| Workspace = `git worktree` | Clones separados | Comparten repositorio; impide la misma rama en dos worktrees |
| Rama de feature con el id completo de la spec (`feature/002-slug`) | Solo slug | Trazabilidad directa spec ↔ rama ↔ tag |
| Tags anotados en cada promoción | Tags ligeros | Guardan autor, fecha y mensaje |
| Primera promoción = `x.0` | `x.1` | Convención simple; marcada como supuesto en la spec |
| Integración en `integration/<slug>` | Reusar `develop` | Aísla la combinación de cambios antes de promover |

## Diseño de CLAUDE.md
Secciones: proyecto, metodología SDD/RPI, flujo Git, workspaces, versionado, reglas para agentes, prompts.
