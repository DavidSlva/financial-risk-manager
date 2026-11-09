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
- `config/environment.ts`: no pertenece a un recurso.
- Los middlewares transversales usan `<nombre>.middleware.ts` (`error-handler.middleware.ts`, `not-found.middleware.ts`).

## Agregar un recurso

1. `services/<recurso>.service.ts`: lógica de negocio.
2. `controllers/<recurso>.controller.ts`: extrae datos de la request y llama al servicio.
3. `routes/<recurso>.routes.ts`: define las rutas y las asocia a los controladores.
4. Registrar el enrutador en `routes/index.ts`.

## Variables de entorno

| Variable                    | Valores                                  | Por defecto    | Obligatoria |
| --------------------------- | ---------------------------------------- | -------------- | ----------- |
| `NODE_ENV`                  | `development`, `test`, `production`      | `development`  | no          |
| `PORT`                      | entero entre 1 y 65535                   | `3000`         | no          |
| `DATA_DIR`                  | carpeta con los archivos de datos        | `backend/data` | no          |
| `JWT_SECRET`                | 128 caracteres hexadecimales (64 bytes)  | —              | **sí**      |
| `JWT_ALGORITHM`             | `HS256`, `HS384`, `HS512`                | `HS256`        | no          |
| `ACCESS_TOKEN_TTL_SECONDS`  | entero positivo                          | `900`          | no          |
| `REFRESH_TOKEN_TTL_SECONDS` | entero positivo, mayor que el del access | `604800`       | no          |

El proceso falla al arrancar si alguna es inválida o si falta `JWT_SECRET`. Los mensajes de error nunca incluyen el valor de la clave.

Generar la clave (solo imprime; no se guarda en ningún archivo):

```
pnpm --filter @financial-risk-manager/backend run generate-secret
```

## Datos

Sin base de datos: tres archivos JSON en `backend/data/` (spec [006-modelo-datos](../docs/specs/006-modelo-datos.md)).

| Archivo       | Contenido                                                 | En git                              |
| ------------- | --------------------------------------------------------- | ----------------------------------- |
| `roles.json`  | Catálogo de roles (nivel de privilegios), extensible      | sí                                  |
| `users.json`  | Usuarios: `rut`, `role` (FK a roles), `active` (vigencia) | no (ejemplo: `users.example.json`)  |
| `scores.json` | Score por rut: `rut` (PK y FK a users), `score` (0–1000)  | no (ejemplo: `scores.example.json`) |

Para empezar: copiar `users.example.json` a `users.json` y `scores.example.json` a `scores.json`.

La integridad referencial se valida al arrancar (el proceso aborta e informa todas las violaciones) y se revalida cuando cambia un archivo. Si los datos dejan de ser íntegros, se rechazan las operaciones que dependan de ellos. Poner `active: false` a un usuario lo revoca sin reiniciar. La función de cada columna está en la spec.

## Autenticación

JWT simétrico (spec [007-auth-jwt](../docs/specs/007-auth-jwt.md)); el algoritmo, la clave y los TTL salen de `config/environment.ts`.

- **Access:** autentica. `Authorization: Bearer <access>` + `authenticate.middleware` → `req.user`.
- **Refresh:** **no autentica**; solo sirve en `POST /api/auth/refresh` para obtener un access nuevo (no rota el refresh).
- **Revocación:** cada validación consulta al usuario en `users.json`. Con `active: false` (o si no existe) el access deja de autenticar y el refresh deja de generar access, sin reiniciar.
- Los rechazos son `401` genéricos con `WWW-Authenticate: Bearer`. Si los datos no son íntegros, no se autentica (`500`).
- Pendiente: cómo se obtiene el primer par de tokens ([009-emision-tokens](../docs/specs/009-emision-tokens.md)).

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
- `POST /api/auth/refresh`: `{ "refreshToken": "..." }` → `{ "accessToken", "expiresIn" }`.

## Pruebas

TDD con Vitest (spec [010-tdd-vitest](../docs/specs/010-tdd-vitest.md)). `test/` replica la estructura de `src/`:

```
src/services/health.service.ts  →  test/services/health.service.test.ts
src/app.ts                      →  test/app.test.ts
```

Comandos: `pnpm run test` (una vez) y `pnpm run test:watch`.
