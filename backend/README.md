# Backend

API en Node.js + TypeScript con **Express**. Es una app pequeña: la estructura busca claridad, no capas de más.

Definido por la spec [005-backend-estructura](../docs/specs/005-backend-estructura.md).

## Estructura

```
backend/
└── src/
    ├── index.ts        # Punto de entrada: lee la configuración y levanta el servidor
    ├── app.ts          # Construye la aplicación Express (middlewares globales y rutas)
    ├── config/
    ├── controllers/
    ├── middlewares/
    ├── models/
    ├── routes/
    ├── services/
    └── types/          # Extensiones de tipos (p. ej. req.user)
```

| Carpeta        | Intención                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/`         | Base del código del backend.                                                                                                                                                   |
| `config/`      | Configuración y validación de variables de entorno (`environment.ts`). Es el único lugar que lee `process.env`. También el mapa de errores HTTP soportados (`http-errors.ts`). |
| `controllers/` | Capa que recibe las peticiones HTTP y extrae los datos de la request. Delegan en `services/` y responden. Sin negocio.                                                         |
| `middlewares/` | Funciones que actúan en cualquier punto del ciclo de vida de la petición (validación, errores, 404, autenticación, etc.).                                                      |
| `models/`      | Tipos del modelo de datos (`Role`, `User`, `Score`, `Violation`). Solo tipos, sin lógica.                                                                                      |
| `routes/`      | Definición de rutas. Un enrutador principal (`index.ts`) une los enrutadores de cada recurso.                                                                                  |
| `services/`    | Capa de negocio. No conoce Express (`Request`/`Response`).                                                                                                                     |
| `types/`       | Extensiones de tipos de librerías (p. ej. `req.user` de Express). Solo declaraciones.                                                                                          |

Flujo: `route → middlewares → controller → service`.

## Convención de nombres: Feature-Driven Separation

En `controllers/`, `routes/`, `services/` (y `middlewares/` cuando aplique) los archivos se nombran:

```
<recurso>.<capa>.<extensión>
```

- **recurso**: nombre de la entidad o dominio, en minúsculas y con guiones (`health`, `risk-profile`).
- **capa**: rol arquitectónico: `controller`, `routes`, `service`, `middleware`.
- **extensión**: `ts`.

Ejemplo con el recurso `health`:

```
controllers/health.controller.ts
routes/health.routes.ts
services/health.service.ts
```

Excepciones:

- `routes/index.ts`: enrutador principal.
- **Rutas HTTP:** los recursos van en **plural** (`/api/users`, `/api/permissions`…). Excepción deliberada: `/api/score/:rut`, que designa el score único de un rut.
- `config/environment.ts`: no pertenece a un recurso.
- Los middlewares transversales usan `<nombre>.middleware.ts` (`error-handler.middleware.ts`, `not-found.middleware.ts`).

## Agregar un recurso

1. `services/<recurso>.service.ts`: lógica de negocio.
2. `controllers/<recurso>.controller.ts`: extrae datos de la request y llama al servicio.
3. `routes/<recurso>.routes.ts`: define las rutas y las asocia a los controladores.
4. Registrar el enrutador en `routes/index.ts`.

## Variables de entorno

| Variable                    | Valores                                  | Por defecto                                                 | Obligatoria |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------------- | ----------- |
| `NODE_ENV`                  | `development`, `test`, `production`      | `development`                                               | no          |
| `PORT`                      | entero entre 1 y 65535                   | `8000`                                                      | no          |
| `CORS_ORIGINS`              | orígenes separados por comas             | `http://localhost:3000` (desarrollo); ninguno en producción | no          |
| `DATA_DIR`                  | carpeta con los archivos de datos        | `backend/data`                                              | no          |
| `JWT_SECRET`                | 128 caracteres hexadecimales (64 bytes)  | —                                                           | **sí**      |
| `JWT_ALGORITHM`             | `HS256`, `HS384`, `HS512`                | `HS256`                                                     | no          |
| `ACCESS_TOKEN_TTL_SECONDS`  | entero positivo                          | `900`                                                       | no          |
| `REFRESH_TOKEN_TTL_SECONDS` | entero positivo, mayor que el del access | `604800`                                                    | no          |
| `LOGIN_MAX_ATTEMPTS`        | entero positivo                          | `5`                                                         | no          |

El proceso falla al arrancar si alguna es inválida o si falta `JWT_SECRET`. Los mensajes de error nunca incluyen el valor de la clave.

Generar la clave (solo imprime; no se guarda en ningún archivo):

```
pnpm --filter @financial-risk-manager/backend run generate-secret
```

## Datos

Sin base de datos: cuatro archivos JSON en `backend/data/` (spec [006-modelo-datos](../docs/specs/006-modelo-datos.md)).

| Archivo            | Contenido                                                                                     | En git                              |
| ------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------- |
| `roles.json`       | Catálogo de roles (nivel de privilegios), extensible                                          | sí                                  |
| `permissions.json` | Permisos por rol: `role` (FK a roles), `key` (catálogo), `value`                              | sí                                  |
| `users.json`       | Usuarios: `rut`, `role` (FK a roles), `active` (vigencia), `password_hash`, `failed_attempts` | no (ejemplo: `users.example.json`)  |
| `scores.json`      | Score por rut: `rut` (PK y FK a users), `score` (0–100)                                       | no (ejemplo: `scores.example.json`) |

Para empezar: copiar `users.example.json` a `users.json` y `scores.example.json` a `scores.json`.

La integridad referencial se valida al arrancar (el proceso aborta e informa todas las violaciones) y se revalida cuando cambia un archivo. Si los datos dejan de ser íntegros, se rechazan las operaciones que dependan de ellos. Poner `active: false` a un usuario lo revoca sin reiniciar. La función de cada columna está en la spec.

## CORS (desarrollo)

Spec [014-cors-desarrollo](../docs/specs/014-cors-desarrollo.md). En producción frontend y backend comparten dominio y **no hay CORS**. En desarrollo el frontend corre en `http://localhost:3000` y el backend en `http://localhost:8000`: mismo sitio, orígenes distintos. Como la sesión va en cookies, el CORS es **con credenciales**: el backend responde `Access-Control-Allow-Origin: <origen permitido>` (nunca `*`) y `Access-Control-Allow-Credentials: true`, y atiende el preflight (`GET, POST, OPTIONS`; `Content-Type, Authorization`).

- `CORS_ORIGINS` reemplaza la lista (p. ej. Vite en `http://localhost:5173`). Cada origen: `http(s)://host[:puerto]`, sin ruta ni barra final; `*` y `null` se rechazan al arrancar. Vacío: sin CORS.
- El frontend debe llamar con `credentials: 'include'` y usar `localhost` (no `127.0.0.1`: otro sitio, `SameSite=Strict` no enviaría las cookies).

## Login y contraseñas

Spec [009-emision-tokens](../docs/specs/009-emision-tokens.md).

**`POST /api/auth/login`** — `Content-Type: application/json`:

```json
{ "rut": "12345678-5", "password": "una-clave-de-ejemplo" }
```

| Campo      | Validación                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------ |
| `rut`      | String en formato canónico con dígito verificador válido (`isValidRut`, sin normalización) |
| `password` | String de **8 a 128 caracteres** (puntos de código Unicode); no se recorta                 |

Estricto: cualquier otro campo → 400. Respuestas:

| Situación                                                                                   | Respuesta                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contrato inválido (se valida antes de tocar los datos)                                      | `400`                                                                                                                                                  |
| Rut inexistente, contraseña incorrecta, usuario no vigente o **bloqueado** (aunque acierte) | `401` idéntico en los cuatro casos                                                                                                                     |
| Datos no íntegros o no se pudo registrar el intento                                         | `500` genérico                                                                                                                                         |
| Correcto                                                                                    | `200` con `Set-Cookie` `access_token` y `refresh_token` (`HttpOnly`, `SameSite=Strict`) y `{ expiresIn, refreshExpiresIn }`; `Cache-Control: no-store` |

**Sesión por cookies:** el login **no devuelve los tokens en el cuerpo**: los entrega en cookies `HttpOnly` (el JavaScript del frontend no las lee) y el navegador las reenvía solo. Frontend y backend funcionan bajo el mismo dominio.

| Cookie          | `Path`      | `Max-Age`                   | Notas                                                 |
| --------------- | ----------- | --------------------------- | ----------------------------------------------------- |
| `access_token`  | `/`         | `ACCESS_TOKEN_TTL_SECONDS`  | `HttpOnly`, `SameSite=Strict`, `Secure` en producción |
| `refresh_token` | `/api/auth` | `REFRESH_TOKEN_TTL_SECONDS` | Solo viaja a las rutas de autenticación               |

El frontend usa `credentials: 'include'` (con el mismo dominio basta el valor por defecto). Para renovar el access: `POST /api/auth/refresh` **sin cuerpo** (lee la cookie `refresh_token`). No hay cierre de sesión por API todavía (punto abierto de la spec 009).

**Límite de intentos:** `users.failed_attempts` cuenta los intentos fallidos; con `failed_attempts >= LOGIN_MAX_ATTEMPTS` el usuario está bloqueado. Un login exitoso lo reinicia a 0. Para desbloquear a mano, poner `failed_attempts` en 0 en `users.json`. El backend **escribe** `users.json` (solo ese contador) de forma atómica.

**Contraseñas:** se guardan como hash `scrypt$N$r$p$sal$hash` en `users.password_hash`, nunca en claro. Para generar el hash de una contraseña (se pide sin mostrarla, o por entrada estándar):

```
pnpm --filter @financial-risk-manager/backend run hash-password
```

`users.example.json` trae dos usuarios de ejemplo cuya contraseña es `ejemplo-1234`.

## Autorización

Spec [011-rbac](../docs/specs/011-rbac.md). Los permisos son **personalizados** (no son endpoints): son claves de un catálogo cerrado (`config/permissions.ts`) asignadas a un rol en `permissions.json` (`role`, `key`, `value`; solo `value: true` concede; sin fila, denegado).

| Permiso             | Significado                                           |
| ------------------- | ----------------------------------------------------- |
| `can_get_score`     | Puede ver su propio score                             |
| `can_get_all_score` | Puede ver el score de cualquier rut (incluye el suyo) |

`authorize(check)` va **después de `authenticate`** y recibe un **callback definido en el service del recurso**: `check({ user, params, query })` devuelve `true` solo si el usuario puede acceder al recurso solicitado. Sin callback no hay autorización permisiva por omisión. Sin `req.user` responde 401; si el callback no devuelve `true`, 403.

```ts
router.get('/:rut', authenticate, authorize(canGetScore), controller.getScore); // callback del service
router.get(
  '/otro',
  authenticate,
  authorize(requirePermission('can_get_all_score')),
  controller.otro,
); // recurso trivial
```

## Autenticación

JWT simétrico (spec [007-auth-jwt](../docs/specs/007-auth-jwt.md)); el algoritmo, la clave y los TTL salen de `config/environment.ts`.

- **Access:** autentica. Se toma de la cookie `access_token` (o, para clientes sin navegador, de `Authorization: Bearer <access>`; con ambos vale solo la cookie) y `authenticate.middleware` deja `req.user`.
- **Refresh:** **no autentica**; vive en la cookie `refresh_token` y solo sirve en `POST /api/auth/refresh` (sin cuerpo) para obtener un access nuevo (no rota el refresh).
- **Revocación:** cada validación consulta al usuario en `users.json`. Con `active: false` (o si no existe) el access deja de autenticar y el refresh deja de generar access, sin reiniciar.
- Los rechazos son `401` genéricos con `WWW-Authenticate: Bearer`. Si los datos no son íntegros, no se autentica (`500`).
- Pendiente: cómo se obtiene el primer par de tokens ([009-emision-tokens](../docs/specs/009-emision-tokens.md)).

## RUT

Spec [008-validador-rut](../docs/specs/008-validador-rut.md). El RUT se guarda y se recibe **solo** en formato canónico `12345678-5`: 7 u 8 dígitos sin ceros a la izquierda, guion y dígito verificador (`0`–`9` o `K` mayúscula), sin puntos ni espacios. `isValidRut` (`rut.service.ts`) valida el formato y el dígito verificador por módulo 11; **no normaliza**: lo que no es canónico es inválido (400). Los datos lo exigen al arrancar (IR-13).

## Errores HTTP

Un **único** `error-handler.middleware` traduce todos los errores usando el mapa de `config/http-errors.ts` (spec [012-errores-http](../docs/specs/012-errores-http.md)). Para responder un error, cualquier capa lanza un `HttpError` de un tipo del mapa; nadie arma respuestas de error a mano.

```ts
import { HttpError } from '../config/http-errors.js';

throw new HttpError('FORBIDDEN');
```

| Tipo                    | Status | Mensaje                                       |
| ----------------------- | ------ | --------------------------------------------- |
| `BAD_REQUEST`           | 400    | `Bad Request`                                 |
| `UNAUTHORIZED`          | 401    | `Unauthorized` (+ `WWW-Authenticate: Bearer`) |
| `FORBIDDEN`             | 403    | `Forbidden`                                   |
| `NOT_FOUND`             | 404    | `Not Found`                                   |
| `INTERNAL_SERVER_ERROR` | 500    | `Internal Server Error`                       |

Cuerpo siempre `{ "error": "<mensaje>" }`. Un error desconocido es 500 (se registra, sin filtrar detalle); un error de librería con `status` soportado (p. ej. JSON malformado → 400) se traduce al tipo correspondiente. Agregar un tipo es agregar una entrada al mapa.

## Endpoints

- `GET /api/health`: estado del servicio.
- `GET /api/score/:rut`: score de un rut → `{ "rut" (formato 12.345.678-9), "score" (0–100), "consulted_at" (UTC) }`. Requiere la cookie `access_token` (o `Authorization: Bearer <access>`). `can_get_all_score` ve cualquier rut; `can_get_score`, solo el propio (403 en otro caso; 404 si no hay score). Spec [013-consulta-score](../docs/specs/013-consulta-score.md).
- `POST /api/auth/login`: `{ "rut", "password" }` → cookies `access_token` y `refresh_token` + `{ "expiresIn", "refreshExpiresIn" }`. Ver _Login y contraseñas_.
- `POST /api/auth/refresh`: sin cuerpo; lee la cookie `refresh_token` → nueva cookie `access_token` + `{ "expiresIn" }`.

## Pruebas

TDD con Vitest (spec [010-tdd-vitest](../docs/specs/010-tdd-vitest.md)). `test/` replica la estructura de `src/`:

```
src/services/health.service.ts  →  test/services/health.service.test.ts
src/app.ts                      →  test/app.test.ts
```

Comandos: `pnpm run test` (una vez) y `pnpm run test:watch`.
