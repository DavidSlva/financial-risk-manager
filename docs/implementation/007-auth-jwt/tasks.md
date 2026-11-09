# Tasks — 007-auth-jwt

Spec: [../../specs/007-auth-jwt.md](../../specs/007-auth-jwt.md) · Plan: [../../plan/007-auth-jwt/plan.md](../../plan/007-auth-jwt/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor. Prerrequisitos cumplidos: spec 006 (usuario y vigencia) y spec 010 (Vitest).

- [ ] T1 — `pnpm add --filter backend jose` (bajo cuarentena de 7 días; confirmar que la versión resuelta cumple)
- [ ] T2 — `config/environment.ts`: `JWT_SECRET` (128 hex), `JWT_ALGORITHM` (HS256/HS384/HS512), `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS` (refresh > access); `JWT_SECRET` de prueba en `vitest.config.ts`; documentar en `backend/README.md`
- [ ] T3 — `scripts/generate-secret.mjs` y script `generate-secret` en `backend/package.json`
- [ ] T4 — `token.service.ts`: `generateTokens` y `verifyToken` (algoritmo configurado, claims, `typ`)
- [ ] T5 — `auth.service.ts`: `authenticateAccess` y `refreshAccess` con comprobación de vigencia y `AuthenticationError`
- [ ] T6 — `types/express.d.ts` y `authenticate.middleware.ts` (Bearer access → `req.user`); `error-handler` traduce `AuthenticationError` a `401` genérico con `WWW-Authenticate`
- [ ] T7 — `auth.controller.ts`, `auth.routes.ts` (`POST /refresh`) y registro en `routes/index.ts`
- [ ] T8 — Verificación: pruebas, lint, tipos, formato; revocar con `active: false` sin reiniciar con el servidor real
- [ ] T9 — Converge: spec (estado final), `implement.md`, índice, `CLAUDE.md` (convenciones de seguridad) y `backend/README.md`
