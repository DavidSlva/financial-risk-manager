# Plan — 013-consulta-score

Spec: [../../specs/013-consulta-score.md](../../specs/013-consulta-score.md)

## Enfoque

Primer recurso real: recorre todas las capas definidas en las specs anteriores. La ruta solo encadena `authenticate → authorize(canGetScore) → controlador`; la regla de acceso está en el service y el controlador solo busca el score.

## Decisiones técnicas

| Decisión                                                     | Alternativas                          | Motivo                                                                                  |
| ------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `canGetScore` en `scores.service`                            | Lógica en la ruta o en el controlador | Pedido explícito: el callback vive en el service del recurso                            |
| `can_get_all_score` se evalúa primero                        | Evaluar `can_get_score` primero       | Quien ve todo no necesita el permiso propio; evita duplicar filas por rol               |
| Rut propio = `user.rut` de `req.user`                        | Leerlo del token (`sub`)              | `req.user` ya pasó por la vigencia y viene de `users.json`                              |
| 403 antes de buscar el score                                 | Buscar y luego decidir                | No revelar la existencia del rut a quien no puede verlo                                 |
| 404 solo para usuarios autorizados                           | 404 también para no autorizados       | Es lo estándar y no filtra información: quien llega al controlador ya puede ver ese rut |
| Comparación textual exacta del rut                           | Normalizar aquí                       | La normalización es la spec 008; no se adelanta                                         |
| Fábricas con dependencias inyectables (`createScoresRouter`) | Dependencias globales                 | Mismo patrón que `auth`: se prueba con un almacén temporal                              |
| Sin listado `GET /api/scores`                                | Agregarlo para `can_get_all_score`    | No pedido; se deja como punto abierto                                                   |

## Riesgos

- Ruts con formatos distintos (puntos, mayúscula en `K`) no coinciden hasta la spec 008: un usuario podría recibir 403 en su propio rut si lo escribe con otro formato.
- Si `scores.json` o `permissions.json` dejan de ser íntegros, no se concede nada (falla cerrado, 500).

## Verificación (TDD)

Pruebas del callback `canGetScore` (matriz de roles y permisos), del endpoint por HTTP con tokens reales (cada celda de la tabla de decisión, revocación y cambio de permisos sin reiniciar, mismo 403 exista o no el rut) y del registro de la ruta en la aplicación.
