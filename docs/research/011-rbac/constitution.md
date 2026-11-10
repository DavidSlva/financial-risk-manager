# Constitution — 011-rbac

Spec: [../../specs/011-rbac.md](../../specs/011-rbac.md)

## Principios y restricciones

- Los permisos son **personalizados** (claves con significado propio), no endpoints ni tipos de consulta.
- El modelo `permission` es simple: clave–valor, en relación 0..n con `roles`, dentro del mismo modelo de datos (spec 006).
- La decisión de acceso a un recurso la toma un **callback definido en el service de ese recurso**; el service solo valida si el usuario puede acceder al recurso solicitado.
- Los services no conocen Express: el callback recibe un contexto plano `{ user, params, query }`.
- Sin permisos concedidos no hay acceso: no existe una ruta "abierta por omisión" (denegar por defecto).
- Los datos siguen el principio de la spec 006: integridad referencial validada, falla cerrada.
- TDD (spec 010): cada regla de integridad y cada rama del middleware nace de una prueba.

## Contexto investigado

- Spec 006: `roles` es una tabla propia; la spec 006 dejó los permisos como punto derivado (esta spec).
- Spec 007: `authenticate` deja `req.user` con el rol vigente leído de `users.json`.
- Spec 012: errores HTTP se lanzan como `HttpError` del mapa de `config/`.
- Convención de la spec 005: callbacks y reglas de negocio en `services/`, enrutado y middlewares en sus carpetas.

## Preguntas abiertas

- Formato de las claves y semántica de `value` (ver spec).
