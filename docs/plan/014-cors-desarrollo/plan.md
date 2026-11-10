# Plan — 014-cors-desarrollo

Spec: [../../specs/014-cors-desarrollo.md](../../specs/014-cors-desarrollo.md)

## Enfoque

Un middleware pequeño y explícito, parametrizado por la lista de orígenes que valida `config/environment.ts`. `createApp` lo monta primero.

## Interfaces

```ts
// config/environment.ts
Environment.corsOrigins: readonly string[]   // CORS_ORIGINS; por defecto ['http://localhost:3000'] salvo en producción

// middlewares/cors.middleware.ts
createCors(origins: readonly string[]): RequestHandler

// app.ts
createApp(options?: { corsOrigins?: readonly string[] }): express.Express
```

## Decisiones técnicas

| Decisión                                                  | Alternativas               | Motivo                                                                                         |
| --------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| Middleware propio                                         | Paquete `cors`             | Sin dependencias nuevas bajo la cuarentena (spec 004); la política es corta y se prueba entera |
| Lista explícita; coincidencia exacta; nunca `*`           | Reflejar el `Origin`       | Con credenciales, reflejar cualquier origen equivale a abrir la sesión a cualquier sitio       |
| Por defecto `http://localhost:3000` salvo en producción   | Siempre vacío              | Pedido: CORS para desarrollo por defecto; en producción el mismo dominio no lo necesita        |
| Validar cada origen con `new URL(o).origin === o`         | Aceptar cualquier texto    | Rechaza `*`, `null`, rutas, barras finales y valores sin esquema al arrancar                   |
| Preflight de origen no permitido → 204 sin cabeceras CORS | 403                        | Es el comportamiento estándar; el navegador bloquea y no se distingue de otros fallos          |
| `Vary: Origin` siempre que hay lista                      | Solo si el origen coincide | Las cachés no deben mezclar respuestas de orígenes distintos                                   |
| `GET, POST, OPTIONS` y `Content-Type, Authorization`      | Reflejar lo pedido         | Lista cerrada y mínima; se amplía con la API                                                   |
| Primero en la cadena (antes de `express.json()`)          | Después del cuerpo         | El preflight debe responderse sin pasar por el parseo ni por las rutas                         |
| `PORT` por defecto 8000                                   | Mantener 3000              | Pedido: el backend en 8000 (el frontend usa 3000)                                              |
| `createApp({ corsOrigins })`                              | Leer siempre el entorno    | Las pruebas fijan la lista sin tocar `process.env`                                             |

## Riesgos

- Un origen de producción mal configurado abriría la sesión a otro sitio: por eso la validación estricta y la lista explícita.
- Cambiar el puerto del frontend en desarrollo exige actualizar `CORS_ORIGINS`.

## Verificación (TDD)

Configuración (`PORT` por defecto 8000; `CORS_ORIGINS`: valores por defecto por `NODE_ENV`, lista, espacios, duplicados, inválidos); middleware (origen permitido y no permitido, `*` nunca, `Vary`, credenciales, preflight, sin `Origin`, lista vacía, varios orígenes); aplicación (preflight de `POST /api/auth/login` desde `localhost:3000`, desde otro origen, sin CORS en la lista vacía); servidor real con `curl`.
