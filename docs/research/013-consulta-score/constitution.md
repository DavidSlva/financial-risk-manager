# Constitution — 013-consulta-score

Spec: [../../specs/013-consulta-score.md](../../specs/013-consulta-score.md)

## Principios y restricciones

- El objetivo de la app es devolver el score asociado a un rut.
- La regla de acceso es **personalizada** y vive en el service del recurso (`scores.service`), no en el middleware ni en la ruta.
- `can_get_all_score` ve cualquier rut; `can_get_score` ve solo el rut del usuario autenticado.
- El rut "propio" sale del usuario autenticado, jamás de datos que controle el cliente.
- Denegar por defecto: sin permiso concedido, 403.
- La respuesta de un usuario no autorizado no debe revelar qué ruts existen.
- Los errores salen del mapa de la spec 012; el service no conoce Express (recibe el contexto plano de la spec 011).
- TDD (spec 010).

## Contexto investigado

- Spec 011: `authorize(check)` pasa `{ user, params, query }` al callback y exige `true` estricto.
- Spec 006: `findScoreByRut`; un usuario puede no tener score; `scores.rut` es único.
- Spec 007: `authenticate` deja en `req.user` al usuario vigente con el rol actual.
- Spec 008 (pendiente): normalización del rut; mientras tanto la comparación es textual.

## Preguntas abiertas

- Listado de scores y diferenciación de 404 (ver spec).
