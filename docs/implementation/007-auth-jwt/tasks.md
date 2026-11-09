# Tasks — 007-auth-jwt

Spec: [../../specs/007-auth-jwt.md](../../specs/007-auth-jwt.md) · Plan: [../../plan/007-auth-jwt/plan.md](../../plan/007-auth-jwt/plan.md)

Prerrequisito: implementación de la spec 006 (usuario y vigencia) y decisión del ejecutor de pruebas.

- [ ] T1 — `pnpm add --filter backend jose` (bajo cuarentena de 7 días; confirmar que la versión resuelta cumple)
- [ ] T2 — `config/environment.ts`: `JWT_SECRET` (128 hex), `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS`; refresh > access; documentar en `backend/README.md`
- [ ] T3 — `scripts/generate-secret.mjs` y script `generate-secret` en `backend/package.json`
- [ ] T4 — `token.service.ts`: `generateTokens` y `verifyToken` (HS256 fijo, claims, `typ`)
- [ ] T5 — `auth.service.ts`: `authenticateAccess` y `refreshAccess` con comprobación de vigencia y `AuthenticationError`
- [ ] T6 — `authenticate.middleware.ts` (Bearer access → `req.user`, `401` genérico con `WWW-Authenticate`)
- [ ] T7 — `auth.controller.ts`, `auth.routes.ts` (`POST /refresh`) y registro en `routes/index.ts`
- [ ] T8 — Pruebas de servicios y HTTP (casos listados en el plan)
- [ ] T9 — Verificación: lint, tipos, formato; revocar con `active: false` sin reiniciar
- [ ] T10 — Converge: spec (estado final), `implement.md`, índice, `CLAUDE.md` (convenciones de seguridad) y `backend/README.md`
