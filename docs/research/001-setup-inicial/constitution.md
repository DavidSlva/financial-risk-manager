# Constitution — 001-setup-inicial
Spec: [../../specs/001-setup-inicial.md](../../specs/001-setup-inicial.md)

## Principios y restricciones
- Monorepo: `backend/` (Node.js + TypeScript) y `frontend/` (React + TypeScript).
- Frontend: SPA con Vite; producción = bundle estático, minificado y anonimizado.
- Metodología: SDD corto (constitution, specify, plan, tasks, implement, converge) sobre RPI.
- La spec es el hub; las specs forman un grafo. Converge siempre actualiza la spec y revisa los documentos relacionados.
- Todo prompt del usuario se registra en `docs/prompts/` con fecha y hora.

## Contexto investigado
Ninguno; setup inicial sin dependencias externas.

## Preguntas abiertas
- Gestor de workspaces (npm/pnpm) y tooling compartido → próxima spec.
