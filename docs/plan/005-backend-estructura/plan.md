# Plan — 005-backend-estructura

Spec: [../../specs/005-backend-estructura.md](../../specs/005-backend-estructura.md)

## Enfoque

Esqueleto mínimo pero funcional, con un recurso de ejemplo (`health`) que recorre todas las capas, para que la convención quede demostrada y no solo descrita.

## Decisiones técnicas

| Decisión                                       | Alternativas                   | Motivo                                                             |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| Express 5                                      | Fastify, Koa, Express 4        | Pedido explícito; la versión 5 gestiona errores asíncronos         |
| `app.ts` separado de `index.ts`                | Todo en un archivo             | Permite probar la app sin abrir un puerto                          |
| Validación de entorno propia, sin dependencias | zod, envalid                   | Solo hay dos variables; evita una dependencia nueva                |
| `parseEnvironment(source)` exportada           | Solo el objeto `environment`   | Se puede probar sin modificar `process.env`                        |
| Rutas bajo `/api`                              | Raíz                           | Deja la raíz libre para servir el frontend estático si se requiere |
| Middlewares `<nombre>.middleware.ts`           | Con recurso                    | Son transversales, no pertenecen a un recurso                      |
| Recurso de ejemplo `health`                    | Carpetas vacías con `.gitkeep` | Demuestra el flujo completo y sirve de plantilla                   |

## Verificación

`eslint`, `tsc`, `prettier --check`; compilar a un directorio temporal, levantar y consultar `GET /api/health`, una ruta inexistente y un `PORT` inválido.
