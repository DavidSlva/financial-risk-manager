# Constitution — 006-modelo-datos

Spec: [../../specs/006-modelo-datos.md](../../specs/006-modelo-datos.md)

## Principios y restricciones

- Sin base de datos: la persistencia son dos archivos JSON.
- Modelo mínimo: el usuario solo tiene `rut`, `role` y `active`; el score solo `rut` y `score`.
- Diseño orientado a SQL: claves primarias, clave foránea y restricciones CHECK, validadas por código.
- Fallar rápido al arrancar y fallar cerrado ante datos inválidos en recarga.
- Los datos reales no se versionan (contienen ruts); se versionan ejemplos ficticios.
- Sin dependencias nuevas para validar: son pocas reglas.
- Capas según la spec 005: lógica en `services/`, rutas y variables en `config/`.

## Contexto investigado

- Spec 005: `config/environment.ts` es el único lugar que lee `process.env`; `services/` no conoce Express.
- `moduleResolution: NodeNext` exige imports con extensión `.js`.
- `active` (vigencia) lo consumirá la spec 007 para revocar tokens.

## Preguntas abiertas

- Valores de `role` y rango del `score` (supuestos en la spec).
- Formato del rut → spec 008.
