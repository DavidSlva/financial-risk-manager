# Constitution — 008-validador-rut

Spec: [../../specs/008-validador-rut.md](../../specs/008-validador-rut.md)

## Principios y restricciones

- Un único formato canónico para el RUT (`12345678-5`), el mismo en almacenamiento, en la API y en lo que envía el frontend.
- **Sin normalización:** el backend valida, no corrige. Una entrada fuera del formato es inválida (400), no se "arregla".
- Validador puro y reutilizable; sin dependencias nuevas (el módulo 11 son pocas líneas).
- Los mismos datos que valida la API los valida la carga de datos (integridad referencial, spec 006).
- La validación de formato no debe alterar el orden de decisión de seguridad: autenticar y autorizar primero (spec 013).
- TDD (spec 010).

## Contexto investigado

- El dígito verificador del RUT chileno se calcula con módulo 11 y la serie 2–7; puede ser `0`–`9` o `K`.
- Todos los RUT de ejemplo del repositorio (`NNNNNNNN-N` con dígitos repetidos) cumplen el módulo 11, así que la nueva regla de integridad no rompe los datos ni las pruebas actuales.
- Spec 013: la comparación del rut propio es textual; un único formato válido la vuelve coherente.

## Preguntas abiertas

- Rango del cuerpo y aplicación al parámetro de score (ver spec).
