---
id: 014-cors-desarrollo
title: CORS para desarrollo (front en localhost:3000, back en localhost:8000)
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [005-backend-estructura, 009-emision-tokens, 010-tdd-vitest]
related: [007-auth-jwt]
supersedes: []
superseded_by: []
---

# 014-cors-desarrollo — CORS para desarrollo

## Resumen

En producción frontend y backend funcionan **bajo el mismo dominio**: no hay peticiones entre orígenes y no hace falta CORS. En **desarrollo** el frontend corre en `http://localhost:3000` y el backend en `http://localhost:8000`: mismo _sitio_ (`localhost`) pero **orígenes distintos** (el puerto cuenta), así que el navegador exige CORS y, como la sesión viaja en cookies ([009-emision-tokens](009-emision-tokens.md)), CORS **con credenciales**. Esta spec configura eso, **por defecto para desarrollo**, y lo deja desactivado en producción.

## Alcance

**Incluye:** puerto por defecto del backend (8000), variable `CORS_ORIGINS` con su validación y valores por defecto, middleware de CORS con credenciales, pruebas.
**No incluye:** servir el frontend desde el backend, configuración del servidor de desarrollo del frontend (Vite), HTTPS en desarrollo.

## Requisitos

- RF-1: **El puerto por defecto del backend pasa a 8000** (antes 3000), que sigue siendo configurable con `PORT`.
- RF-2: `CORS_ORIGINS` (en `config/environment.ts`): lista de orígenes permitidos separados por comas. **Por defecto:** `http://localhost:3000` cuando `NODE_ENV` es `development` o `test`; **ninguno** (CORS desactivado) en `production`. Un valor vacío significa "ninguno".
- RF-3: Cada origen debe ser un **origen válido**: `http` o `https`, host y puerto opcional, **sin ruta ni barra final** (`new URL(valor).origin === valor`). Se rechazan `*`, `null`, valores sin esquema (`localhost:3000`) y con ruta; el arranque falla informando cuál. Los repetidos se eliminan.
- RF-4: Un middleware de CORS, **primero en la cadena** (antes del cuerpo y de las rutas). Si el `Origin` de la petición está en la lista (coincidencia exacta), responde con `Access-Control-Allow-Origin: <ese origen>`, `Access-Control-Allow-Credentials: true` y `Vary: Origin`. **Nunca** `*` y **nunca** refleja un origen que no esté en la lista.
- RF-5: **Preflight** (`OPTIONS` con `Origin` y `Access-Control-Request-Method`): de un origen permitido responde `204` con `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization` y `Access-Control-Max-Age: 600`, sin continuar por el resto de la cadena. De un origen no permitido responde `204` **sin** cabeceras CORS (el navegador lo bloquea).
- RF-6: Una petición **sin `Origin`** (mismo origen o clientes que no son navegador) sigue su curso sin cabeceras CORS. Con la lista vacía el middleware no hace nada.
- RF-7: Con esto las cookies de sesión funcionan entre `localhost:3000` y `localhost:8000`: el frontend debe llamar con `credentials: 'include'` y usar `localhost` (no `127.0.0.1`, que es otro sitio y `SameSite=Strict` no enviaría las cookies).

## Diseño

```
backend/src/
├── config/environment.ts                 # PORT por defecto 8000; CORS_ORIGINS → Environment.corsOrigins
├── middlewares/cors.middleware.ts        # createCors(origins)
└── app.ts                                # createApp({ corsOrigins }) → app.use(createCors(...)) primero
```

| Petición                                                | Respuesta                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Origin: http://localhost:3000` (permitido)             | Cabeceras CORS con ese origen, `Allow-Credentials: true`, `Vary: Origin` |
| `Origin: http://evil.example` (no permitido)            | Sin cabeceras CORS (el navegador bloquea la lectura de la respuesta)     |
| `OPTIONS` + `Access-Control-Request-Method` (permitido) | `204` con métodos, cabeceras y `Max-Age`                                 |
| Sin `Origin`                                            | Sin cambios                                                              |
| `NODE_ENV=production` sin `CORS_ORIGINS`                | Middleware inactivo (mismo dominio)                                      |

## Documentos RPI

- Research (constitution): [../research/014-cors-desarrollo/constitution.md](../research/014-cors-desarrollo/constitution.md)
- Plan: [../plan/014-cors-desarrollo/plan.md](../plan/014-cors-desarrollo/plan.md)
- Tasks: [../implementation/014-cors-desarrollo/tasks.md](../implementation/014-cors-desarrollo/tasks.md)
- Implement: [../implementation/014-cors-desarrollo/implement.md](../implementation/014-cors-desarrollo/implement.md)
- Prompt origen: [../prompts/2026-11-09_2131_009-014-login-por-cookies-y-cors.md](../prompts/2026-11-09_2131_009-014-login-por-cookies-y-cors.md)

## Specs relacionadas

- depende de: [005-backend-estructura](005-backend-estructura.md) — `config/`, `middlewares/` y `app.ts`.
- depende de: [009-emision-tokens](009-emision-tokens.md) — la sesión por cookies es lo que exige CORS con credenciales.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — se implementa con TDD.
- relacionada con: [007-auth-jwt](007-auth-jwt.md) — la autenticación que viaja en esas cookies.

## Puntos abiertos

- **Cabeceras y métodos permitidos:** `GET, POST, OPTIONS` y `Content-Type, Authorization` son los que usa la API hoy; se amplían cuando haya nuevas rutas.
- **Frontend en otro dominio en producción:** no es el caso hoy (mismo dominio). Si cambiara, bastaría `CORS_ORIGINS` con el origen de producción, pero `SameSite=Strict` dejaría de servir y habría que revisar la política de cookies.
- **Desarrollo con otro puerto del frontend:** se cambia con `CORS_ORIGINS` (p. ej. Vite en `http://localhost:5173`).

## Estado final (Converge)

Implementado con TDD en `feature/014-cors-desarrollo` (workspace `D:\Persona-ws\014-cors-desarrollo`): las pruebas se escribieron primero y se confirmó que fallaban (32 pruebas en rojo y 1 módulo sin existir) antes de implementar. Resultado: **626 pruebas en verde** (58 nuevas), `eslint`, `tsc` y `prettier --check` sin errores.

Verificado con el servidor real **en su puerto por defecto (8000)** y cabeceras de navegador: el preflight desde `http://localhost:3000` responde 204 con origen, credenciales, métodos, cabeceras y `Max-Age`; desde un origen ajeno, 204 sin cabeceras CORS; el login con `Origin` del frontend entrega las cookies con `Access-Control-Allow-Origin` y `Allow-Credentials`; la lectura del score con la cookie funciona; con `NODE_ENV=production` y sin `CORS_ORIGINS` no hay ninguna cabecera CORS.

Implementado:

- `PORT` por defecto **8000**. `CORS_ORIGINS` en `config/environment.ts`: por defecto `http://localhost:3000` (desarrollo y pruebas) y ninguno en producción; lista separada por comas, sin repetidos; cada origen se valida con `new URL(o).origin === o` (solo `http`/`https`, sin ruta, barra final, credenciales ni comodines), y el arranque falla indicando cuál es inválido.
- `middlewares/cors.middleware.ts` (`createCors`): coincidencia exacta, nunca `*`, nunca se refleja un origen ajeno; `Vary: Origin`; preflight respondido antes del cuerpo y las rutas (204; con cabeceras solo si el origen está permitido); sin `Origin` o con lista vacía no hace nada.
- `createApp({ corsOrigins })` monta el middleware **primero**, de modo que también los errores (401, 404, 500) llevan las cabeceras CORS y el frontend puede leerlos.

Notas:

- Sin dependencias nuevas (no se usó el paquete `cors`).
- Para que las cookies `SameSite=Strict` viajen entre `localhost:3000` y `localhost:8000` el frontend debe usar `localhost` (no `127.0.0.1`) y `credentials: 'include'`.
- Cierre a las 21:42.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (005 con nota de evolución; 009 y 007 sin cambios)
- [x] índice `specs/README.md` actualizado
