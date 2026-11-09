---
id: 013-consulta-score
title: Consulta de score por rut con autorización personalizada
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [006-modelo-datos, 007-auth-jwt, 010-tdd-vitest, 011-rbac, 012-errores-http]
related: []
supersedes: []
superseded_by: []
---

# 013-consulta-score — Consulta de score por rut

## Resumen

Es el objetivo de la app: **devolver el score financiero asociado a un rut**. El endpoint `GET /api/scores/:rut` exige autenticación y autorización. Es el primer recurso con **regla de autorización propia**: el callback vive en `scores.service` ([011-rbac](011-rbac.md)) y decide así:

- `can_get_all_score` → puede ver el score de **cualquier** rut.
- `can_get_score` → puede ver el score **solo de su propio rut** (el del usuario autenticado).
- Cualquier otro caso → denegado.

## Alcance

**Incluye:** endpoint `GET /api/scores/:rut`, callback de autorización `canGetScore` en `scores.service`, controlador y rutas, pruebas, documentación.
**No incluye:** listado de todos los scores, escritura o recálculo de scores, validación del formato del rut ([008-validador-rut](008-validador-rut.md)).

## Requisitos

- RF-1: `GET /api/scores/:rut` → `200` con `{ "rut": "...", "score": N }`.
- RF-2: La ruta se protege con `authenticate` y luego `authorize(canGetScore)`. Sin token válido → `401`; sin permiso → `403`.
- RF-3: `canGetScore(contexto)` está definido en `scores.service` y es la **única** lógica de acceso del recurso:
  1. si el rol del usuario tiene `can_get_all_score` → `true`;
  2. si no, `true` solo si tiene `can_get_score` **y** `:rut` es exactamente el rut del usuario autenticado;
  3. en cualquier otro caso → `false`.
- RF-4: El rut propio se toma **del usuario autenticado** (`req.user`, que sale de `users.json`), nunca del cuerpo ni de la query.
- RF-5: Un usuario autorizado que consulta un rut **sin score** (o inexistente) recibe `404` (`NOT_FOUND`).
- RF-6: Un usuario **no autorizado** recibe el mismo `403` exista o no el rut: la respuesta no permite averiguar qué ruts existen.
- RF-7: Los permisos y el rol se evalúan en cada petición con los datos vigentes (revocar un usuario o quitar un permiso rige sin reiniciar).
- RF-8: Solo `GET`; las demás verbas sobre la ruta responden `404` del mapa de errores.

## Tabla de decisión

| Rol / permisos                      | Su propio rut (con score) | Rut ajeno (existe) | Rut inexistente | Su propio rut (sin score) |
| ----------------------------------- | ------------------------- | ------------------ | --------------- | ------------------------- |
| `can_get_all_score`                 | 200                       | 200                | 404             | 404                       |
| solo `can_get_score`                | 200                       | **403**            | **403**         | 404                       |
| `can_get_score` en `false` (negado) | 403                       | 403                | 403             | 403                       |
| sin permisos                        | 403                       | 403                | 403             | 403                       |
| usuario no vigente / token inválido | 401                       | 401                | 401             | 401                       |

## Diseño

```
backend/src/
├── services/scores.service.ts        # findScoreByRut (006) + canGetScore (callback de autorización)
├── controllers/scores.controller.ts  # getScore: busca el score; NOT_FOUND si no hay
├── routes/scores.routes.ts           # GET /:rut → authenticate → authorize(canGetScore) → getScore
└── routes/index.ts                   # + router.use('/scores', scoresRouter)
```

```ts
// scores.service.ts
export function canGetScore(
  { user, params }: AuthorizationContext,
  store = getDataStore(),
): boolean {
  if (hasPermission(user.role, PERMISSIONS.CAN_GET_ALL_SCORE, store)) return true;
  return hasPermission(user.role, PERMISSIONS.CAN_GET_SCORE, store) && params.rut === user.rut;
}
```

## Documentos RPI

- Research (constitution): [../research/013-consulta-score/constitution.md](../research/013-consulta-score/constitution.md)
- Plan: [../plan/013-consulta-score/plan.md](../plan/013-consulta-score/plan.md)
- Tasks: [../implementation/013-consulta-score/tasks.md](../implementation/013-consulta-score/tasks.md)
- Implement: [../implementation/013-consulta-score/implement.md](../implementation/013-consulta-score/implement.md)
- Prompt origen: [../prompts/2026-11-09_2045_011-012-013-errores-y-autorizacion.md](../prompts/2026-11-09_2045_011-012-013-errores-y-autorizacion.md)

## Specs relacionadas

- depende de: [006-modelo-datos](006-modelo-datos.md) — `scores.json` y `findScoreByRut`.
- depende de: [007-auth-jwt](007-auth-jwt.md) — `authenticate` y el usuario vigente.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — se implementa con TDD.
- depende de: [011-rbac](011-rbac.md) — `authorize`, permisos y el catálogo.
- depende de: [012-errores-http](012-errores-http.md) — `FORBIDDEN` y `NOT_FOUND`.
- la validación del formato del rut queda en [008-validador-rut](008-validador-rut.md).

## Puntos abiertos

- **Comparación del rut propio:** es textual exacta. Mientras no exista la normalización de [008-validador-rut](008-validador-rut.md), `12.345.678-5` y `12345678-5` son ruts distintos.
- **Listado de todos los scores** (¿`can_get_all_score` implica un `GET /api/scores`?): se interpretó como "ver el score de cualquier rut", sin listado.
- **Usuario sin score:** hoy `404`; se podría distinguir "rut inexistente" de "sin score" solo para quienes tienen `can_get_all_score`.

## Estado final (Converge)

Implementado con TDD en `feature/013-consulta-score` (workspace `D:\Persona-ws\013-consulta-score`): las pruebas se escribieron primero y se confirmó que fallaban (12 pruebas en rojo y 1 archivo sin compilar) antes de implementar. Resultado: 273 pruebas en verde (34 nuevas), `eslint`, `tsc` y `prettier --check` sin errores.

Verificado con el servidor compilado y tokens firmados: el admin ve el score de otro rut (200); el usuario ve el suyo (200) y no el del admin (403); un rut inexistente da 403 al usuario y 404 al admin; un usuario sin score consultando el suyo recibe 404; sin token, 401.

Implementado:

- `scores.service.ts`: `canGetScore` (callback de autorización del recurso) junto a `findScoreByRut`. Evalúa `can_get_all_score` primero; luego `can_get_score` con el rut exacto del usuario autenticado.
- `scores.controller.ts` (`getScore`, 404 si no hay score), `scores.routes.ts` (`authenticate` → `authorize` → controlador) y registro en `routes/index.ts`.
- Cubre cada celda de la tabla de decisión, la revocación y el cambio de permisos sin reiniciar, y que el 403 sea idéntico exista o no el rut.

Notas:

- El 403 se decide **antes** de buscar el score; el 404 solo lo ve quien ya está autorizado.
- La comparación del rut propio es textual hasta que exista la normalización de [008-validador-rut](008-validador-rut.md).
- Las specs [011](011-rbac.md) y [012](012-errores-http.md) enlazan ahora a esta.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (011 y 012 enlazadas; 008 sigue pendiente)
- [x] índice `specs/README.md` actualizado
