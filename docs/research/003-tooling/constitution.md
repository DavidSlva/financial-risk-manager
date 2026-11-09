# Constitution — 003-tooling

Spec: [../../specs/003-tooling.md](../../specs/003-tooling.md)

## Principios y restricciones

- Node 22.22 en todo el repo (`.nvmrc` + `engines`).
- Prettier manda en estilo; ESLint no debe discrepar de él.
- Los hooks bloquean el commit si falla formato, lint, tipos o el mensaje.
- Commitlint: solo Conventional Commits + scope = id numérico de la spec. Sin reglas adicionales.
- Los prompts en `docs/prompts` se conservan textuales (excluidos de Prettier).

## Contexto investigado

- Entorno local: Node v22.22.2, npm 10.9.7.
- Repo remoto: https://github.com/DavidSlva/financial-risk-manager
- Husky 9 usa `core.hooksPath`; con `git worktree` esa config es compartida entre workspaces.

## Preguntas abiertas

- Gestor de paquetes: se eligió npm workspaces (no estaba definido). Revisar si se prefiere pnpm.
- Instalar React/Vite y librerías del backend → specs posteriores.
