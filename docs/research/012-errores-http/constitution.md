# Constitution — 012-errores-http

Spec: [../../specs/012-errores-http.md](../../specs/012-errores-http.md)

## Principios y restricciones

- Un solo manejador de errores; agregar un tipo de error no debe requerir un middleware nuevo.
- Los tipos de error soportados viven en `config/` y los importa cualquier capa, incluidas las rutas.
- Los mensajes de error al cliente son genéricos y salen únicamente del mapa (nada de detalle interno).
- Los servicios no conocen Express: lanzan `HttpError`, que no depende de él.
- TDD (spec 010): cada tipo y cada traducción nace de una prueba.

## Contexto investigado

- Estado actual (spec 007): `error-handler` conoce `AuthenticationError`; `not-found` y el 400 del refresh arman su respuesta a mano.
- Un JSON malformado en `express.json()` llega al manejador como error con `status 400` y hoy se responde 500.
- Express 5 propaga a `next(err)` los errores lanzados en handlers asíncronos.

## Preguntas abiertas

- Tipos adicionales y detalle de validación (ver spec).
