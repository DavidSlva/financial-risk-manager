# Persona

Monorepo con backend y frontend, desarrollado con **Spec Driven Development (SDD) corto** sobre documentación **RPI** (Research · Plan · Implementation).

| Carpeta     | Contenido                                                                               |
| ----------- | --------------------------------------------------------------------------------------- |
| `backend/`  | API en Node.js + TypeScript                                                             |
| `frontend/` | SPA en React + TypeScript con Vite. Producción: bundle estático, minificado/anonimizado |
| `docs/`     | Toda la documentación: specs, research, plan, implementation y prompts                  |

Metodología: ver [`docs/README.md`](docs/README.md).

## Empezar

Requisitos: Node **22.22** (`nvm use`, ver `.nvmrc`) y **pnpm** (versión fijada en `packageManager`).

```
pnpm install
pnpm run test          # Vitest (TDD)
pnpm run lint          # ESLint
pnpm run typecheck     # tsc en backend y frontend
pnpm run format:check  # Prettier (solo valida)
```

El backend necesita datos y una clave JWT para arrancar: ver [`backend/README.md`](backend/README.md). El flujo de trabajo (gitflow, workspaces, commits `tipo(NNN): ...`, TDD y política de dependencias) está en [`CLAUDE.md`](CLAUDE.md). Las specs y su índice, en [`docs/specs/README.md`](docs/specs/README.md).
