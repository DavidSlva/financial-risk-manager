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
    ├── routes/
    └── services/
```

| Carpeta        | Intención                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/`         | Base del código del backend.                                                                                              |
| `config/`      | Configuración y validación de variables de entorno (`environment.ts`). Es el único lugar que lee `process.env`.           |
| `controllers/` | Capa que recibe las peticiones HTTP y extrae los datos de la request. Delegan en `services/` y responden. Sin negocio.    |
| `middlewares/` | Funciones que actúan en cualquier punto del ciclo de vida de la petición (validación, errores, 404, autenticación, etc.). |
| `routes/`      | Definición de rutas. Un enrutador principal (`index.ts`) une los enrutadores de cada recurso.                             |
| `services/`    | Capa de negocio. No conoce Express (`Request`/`Response`).                                                                |

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

| Variable   | Valores                             | Por defecto   |
| ---------- | ----------------------------------- | ------------- |
| `NODE_ENV` | `development`, `test`, `production` | `development` |
| `PORT`     | entero entre 1 y 65535              | `3000`        |

El proceso falla al arrancar si alguna es inválida.

## Endpoints

- `GET /api/health`: estado del servicio.

## Pruebas

TDD con Vitest (spec [010-tdd-vitest](../docs/specs/010-tdd-vitest.md)). `test/` replica la estructura de `src/`:

```
src/services/health.service.ts  →  test/services/health.service.test.ts
src/app.ts                      →  test/app.test.ts
```

Comandos: `pnpm run test` (una vez) y `pnpm run test:watch`.
