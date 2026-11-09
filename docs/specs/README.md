# Índice de Specs

Cada spec es un nodo del grafo. Las relaciones se declaran en el front matter de cada spec y se resumen aquí.

| ID | Título | Estado | Depende de | Relacionada con | Research | Plan | Implementation |
|----|--------|--------|------------|-----------------|----------|------|----------------|
| [001-setup-inicial](001-setup-inicial.md) | Setup inicial del monorepo y metodología | converged | — | 002 | [constitution](../research/001-setup-inicial/constitution.md) | [plan](../plan/001-setup-inicial/plan.md) | [tasks](../implementation/001-setup-inicial/tasks.md) · [implement](../implementation/001-setup-inicial/implement.md) |
| [002-flujo-git-agentes](002-flujo-git-agentes.md) | Flujo Git, workspaces de agentes y versionado | converged | 001 | — | [constitution](../research/002-flujo-git-agentes/constitution.md) | [plan](../plan/002-flujo-git-agentes/plan.md) | [tasks](../implementation/002-flujo-git-agentes/tasks.md) · [implement](../implementation/002-flujo-git-agentes/implement.md) |

Estados: `draft` → `specified` → `planned` → `tasked` → `implementing` → `converged`.

## Grafo

```mermaid
graph LR
  S001[001-setup-inicial]
  S002[002-flujo-git-agentes]
  S002 -->|depende de| S001
```
