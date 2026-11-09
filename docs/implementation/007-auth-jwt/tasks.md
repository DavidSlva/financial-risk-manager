# Tasks — 007-auth-jwt

Spec: [../../specs/007-auth-jwt.md](../../specs/007-auth-jwt.md) · Plan: [../../plan/007-auth-jwt/plan.md](../../plan/007-auth-jwt/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor. Prerrequisitos cumplidos: spec 006 (usuario y vigencia) y spec 010 (Vitest).

- [x] T1 — `pnpm add --filter backend jose` (bajo cuarentena de 7 días; confirmar que la versión resuelta cumple)
- [x] T2 — `config/environment.ts`: `JWT_SECRET` (128 hex), `JWT_ALGORITHM` (HS256/HS384/HS512), `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS` (refresh > access); `JWT_SECRET` de prueba en `vitest.config.ts`; documentar en `backend/README.md`
- [x] T3 — `scripts/generate-secret.mjs` y script `generate-secret` en `backend/package.json`
- [x] T4 — `token.service.ts`: `generateTokens` y `verifyToken` (algoritmo configurado, claims, `typ`)
- [x] T5 — `auth.service.ts`: `authenticateAccess` y `refreshAccess` con comprobación de vigencia y `AuthenticationError`
- [x] T6 — `types/express.d.ts` y `authenticate.middleware.ts` (Bearer access → `req.user`); `error-handler` traduce `AuthenticationError` a `401` genérico con `WWW-Authenticate`
- [x] T7 — `auth.controller.ts`, `auth.routes.ts` (`POST /refresh`) y registro en `routes/index.ts`
- [x] T8 — Verificación: pruebas, lint, tipos, formato; revocar con `active: false` sin reiniciar con el servidor real
- [x] T9 — Converge: spec (estado final), `implement.md`, índice, `CLAUDE.md` (convenciones de seguridad) y `backend/README.md`
- [ ] T10 — Push y PR (requiere confirmación)
