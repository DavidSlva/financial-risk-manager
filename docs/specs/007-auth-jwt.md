---
id: 007-auth-jwt
title: Autenticación JWT simétrica con access/refresh y revocación por vigencia
status: tasked
created: 2026-11-09
updated: 2026-11-09
depends_on: [006-modelo-datos, 010-tdd-vitest]
related: [005-backend-estructura]
supersedes: []
superseded_by: []
---

# 007-auth-jwt — Autenticación JWT

## Resumen

Autenticación con **JWT simétrico**. Un servicio genera el par **access + refresh**. El access autentica; el refresh **no autentica**: solo sirve para obtener un nuevo access. La **revocación** se hace con la marca de vigencia del usuario (`active`, spec [006](006-modelo-datos.md)): si el usuario deja de estar vigente, el access deja de autenticar y el refresh deja de poder generar un access nuevo. El **algoritmo**, la clave y los TTL se definen en la configuración.

## Alcance

**Incluye:** clave simétrica, algoritmo configurable, generación y verificación de tokens, TTL configurables, validador que consulta la vigencia, middleware de autenticación, endpoint de refresh.
**No incluye:** emisión del primer par de tokens / login ([009-emision-tokens](009-emision-tokens.md), pendiente), revocación por token individual, rotación del refresh, autorización por rol por ruta ([011-rbac](011-rbac.md)), límite de intentos.

## Requisitos

- RF-1: **Clave simétrica** de 64 bytes generada con `crypto.randomBytes(64)`, entregada como `JWT_SECRET` (128 caracteres hexadecimales). `config/environment.ts` valida que existan esos 64 bytes y el proceso no arranca sin ella. Un script (`pnpm --filter @financial-risk-manager/backend run generate-secret`) la genera e imprime; no se guarda en el repositorio.
- RF-2: **El algoritmo va en la configuración:** `JWT_ALGORITHM` en `config/environment.ts`, por defecto `HS256`. Solo se admiten algoritmos simétricos (`HS256`, `HS384`, `HS512`); cualquier otro valor (incluido `none` o uno asimétrico) hace fallar el arranque. Al firmar y al verificar se usa únicamente el algoritmo configurado; un token firmado con otro se rechaza.
- RF-3: Un **servicio de tokens** genera el access y el refresh a partir de un usuario.
- RF-4: TTL en la configuración (`config/environment.ts`): `ACCESS_TOKEN_TTL_SECONDS` (por defecto 900) y `REFRESH_TOKEN_TTL_SECONDS` (por defecto 604800). Enteros positivos; el del refresh debe ser mayor que el del access.
- RF-5: Claims: `sub` = rut, `typ` = `access` | `refresh`, `jti` (UUID), `iat`, `exp`. El rol no va en el token.
- RF-6: **El refresh no autentica:** el middleware de autenticación rechaza cualquier token cuyo `typ` no sea `access`. **El access no refresca:** el endpoint de refresh rechaza cualquier token cuyo `typ` no sea `refresh`.
- RF-7: **Validador con vigencia:** toda validación (access o refresh) tras verificar firma, expiración y `typ` consulta al usuario en `users.json` (vía el servicio de la spec 006). Si no existe o `active` es `false` → rechazo.
- RF-8: `POST /api/auth/refresh` con `{ "refreshToken": "..." }` devuelve un **nuevo access**. No devuelve un refresh nuevo (sin rotación).
- RF-9: El rol que se usa para autorizar sale del usuario en `users.json` en el momento de la petición, no del token.
- RF-10: Las respuestas de rechazo son `401` con mensaje genérico (no revelan si falló la firma, la expiración o la vigencia) y cabecera `WWW-Authenticate: Bearer`.

## Configuración

| Variable                    | Valores                                  | Por defecto | Obligatoria |
| --------------------------- | ---------------------------------------- | ----------- | ----------- |
| `JWT_SECRET`                | 128 caracteres hexadecimales (64 bytes)  | —           | sí          |
| `JWT_ALGORITHM`             | `HS256`, `HS384`, `HS512`                | `HS256`     | no          |
| `ACCESS_TOKEN_TTL_SECONDS`  | entero positivo                          | `900`       | no          |
| `REFRESH_TOKEN_TTL_SECONDS` | entero positivo, mayor que el del access | `604800`    | no          |

## Diseño

```
backend/
├── scripts/generate-secret.mjs            # crypto.randomBytes(64).toString('hex')
├── src/
│   ├── config/environment.ts              # + JWT_SECRET, JWT_ALGORITHM, TTLs
│   ├── services/
│   │   ├── token.service.ts               # generateTokens(user), verifyToken(token, typ)  (sin acceso a datos)
│   │   └── auth.service.ts                # validador: authenticateAccess(token), refreshAccess(token), AuthenticationError
│   ├── middlewares/
│   │   ├── authenticate.middleware.ts     # Bearer access → req.user
│   │   └── error-handler.middleware.ts    # AuthenticationError → 401 genérico
│   ├── controllers/auth.controller.ts     # refresh
│   ├── routes/auth.routes.ts              # POST /refresh   (registrado en routes/index.ts)
│   └── types/express.d.ts                 # req.user
└── test/                                   # espejo de src/ (+ test/scripts/)
```

Flujo de autenticación: `Authorization: Bearer <access>` → `authenticate.middleware` → `auth.service.authenticateAccess` → `token.service.verifyToken(…, 'access')` → `users.service.findUserByRut(sub)` → vigente → `req.user`.

Flujo de refresh: `POST /api/auth/refresh` → `auth.service.refreshAccess` → `verifyToken(…, 'refresh')` → usuario vigente → `generateTokens(user).accessToken`.

Revocar a un usuario = poner `active: false` en `users.json`. Rige desde la siguiente petición (recarga por fecha de modificación, spec 006).

## Documentos RPI

- Research (constitution): [../research/007-auth-jwt/constitution.md](../research/007-auth-jwt/constitution.md)
- Plan: [../plan/007-auth-jwt/plan.md](../plan/007-auth-jwt/plan.md)
- Tasks: [../implementation/007-auth-jwt/tasks.md](../implementation/007-auth-jwt/tasks.md)
- Implement: pendiente
- Prompts origen: [../prompts/2026-11-09_2002_006-007-modelo-datos-y-auth.md](../prompts/2026-11-09_2002_006-007-modelo-datos-y-auth.md), [../prompts/2026-11-09_2013_010-tdd-vitest.md](../prompts/2026-11-09_2013_010-tdd-vitest.md)

## Specs relacionadas

- depende de: [006-modelo-datos](006-modelo-datos.md) — usuario y marca de vigencia.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — se implementa con TDD y Vitest.
- relacionada con: [005-backend-estructura](005-backend-estructura.md) — ubicación en capas y convención de nombres.
- deriva en: [009-emision-tokens](009-emision-tokens.md) — cómo se obtiene el primer par de tokens (pendiente).
- la autorización por rol ([011-rbac](011-rbac.md)) se apoya en `req.user`.

## Puntos abiertos

- **Biblioteca JWT:** `jose` (sin dependencias, mantenida), entra por `pnpm add` bajo la cuarentena de 7 días. Alternativa: `jsonwebtoken`.
- **Rotación de clave:** una sola clave activa; rotarla invalida todos los tokens.
- **Revocación por token (`jti`) y rotación del refresh:** fuera de alcance; el `jti` queda en el token para habilitarlo después.
- **Emisión de tokens:** ver 009.

## Estado final (Converge)

Pendiente: la spec está en etapa `tasked`; falta implementar y hacer converge.
