# Constitution — 006-modelo-datos

Spec: [../../specs/006-modelo-datos.md](../../specs/006-modelo-datos.md)

## Principios y restricciones

- Sin base de datos: la persistencia son archivos JSON.
- Modelo mínimo: cada columna tiene una función explícita y documentada en la spec.
- El rol es **extensible**: tiene su propio modelo (`roles`) y `users.role` es clave foránea; agregar un rol no cambia código.
- Diseño orientado a SQL: claves primarias, claves foráneas y restricciones CHECK, validadas por código.
- Fallar rápido al arrancar y fallar cerrado ante datos inválidos en recarga.
- Los datos personales (ruts) no se versionan; se versionan ejemplos ficticios. `roles.json` no es personal y sí se versiona.
- Sin dependencias nuevas para validar: son pocas reglas.
- Capas según la spec 005: lógica en `services/`, variables en `config/`.
- TDD (spec 010): cada regla de integridad nace de una prueba que falla.

## Contexto investigado

- Spec 005: `config/environment.ts` es el único lugar que lee `process.env`; `services/` no conoce Express.
- Spec 010: pruebas en `test/` espejo de `src/`, con Vitest.
- `moduleResolution: NodeNext` exige imports con extensión `.js`.
- `active` lo consumirá la spec 007 para revocar tokens.
- Una spec posterior (011-rbac) agregará `permissions` (clave–valor) en relación 0..n con `roles`.

## Preguntas abiertas

- Valores iniciales de `roles` y rango del `score` (supuestos en la spec).
- Formato del rut → spec 008. Permisos → spec 011.
