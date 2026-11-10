---
id: 011-rbac
title: RBAC simple con permisos personalizados y middleware de autorización
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [006-modelo-datos, 007-auth-jwt, 010-tdd-vitest, 012-errores-http]
related: [013-consulta-score]
supersedes: []
superseded_by: []
---

# 011-rbac — RBAC simple con permisos personalizados

## Resumen

Control de acceso por rol. Cada rol (`roles`) se relaciona de **0 a n** con **permisos** clave–valor dentro del mismo modelo de datos. Un **middleware de autorización**, que se ejecuta después de autenticar ([007-auth-jwt](007-auth-jwt.md)), decide si el usuario puede acceder al recurso pedido.

> **Cambia una definición.** Antes se planteó que los permisos eran a nivel de endpoint o tipo de consulta. **Ahora son personalizados:** cada permiso es una clave con un significado propio, y la regla que decide el acceso a un recurso la define el **service de ese recurso** mediante un callback. El permiso no mapea a un endpoint.

## Alcance

**Incluye:** modelo `permissions` y sus reglas de integridad, catálogo de permisos soportados (`can_get_score`, `can_get_all_score`), servicio de permisos, middleware `authorize(callback)`, datos iniciales, pruebas.
**No incluye:** el recurso `score` y su callback de autorización ([013-consulta-score](013-consulta-score.md)), administración de permisos por API, permisos con alcance o jerarquía de roles.

## Modelo

Se agrega a la referencia SQL de [006-modelo-datos](006-modelo-datos.md):

```sql
CREATE TABLE permissions (
  role   TEXT    NOT NULL REFERENCES roles (name) ON DELETE RESTRICT,
  key    TEXT    NOT NULL CHECK (key IN ('can_get_score', 'can_get_all_score')),
  value  BOOLEAN NOT NULL,
  PRIMARY KEY (role, key)
);
```

Relación: `roles 1 — 0..n permissions`. Un rol sin filas no tiene ningún permiso.

### Columnas y su función

| Columna | Tipo    | Nulo | Función                                                                                                                                       |
| ------- | ------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`  | string  | no   | Rol al que se le asigna el permiso. **Clave foránea** a `roles.name`.                                                                         |
| `key`   | string  | no   | Nombre del permiso, de un **catálogo cerrado** definido en código (`config/permissions.ts`). Con `role` forma la **clave primaria**.          |
| `value` | boolean | no   | `true` concede el permiso; `false` lo niega explícitamente. La **ausencia** de la fila también significa "no concedido": solo `true` concede. |

### Catálogo de permisos

| Clave               | Significado                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| `can_get_score`     | Puede ver **su propio** score (el del rut con el que está autenticado). |
| `can_get_all_score` | Puede ver el score de **cualquier** rut.                                |

`can_get_all_score` incluye a `can_get_score`: quien puede ver cualquier score puede ver el propio. Cómo se aplica cada permiso lo decide el callback del recurso ([013](013-consulta-score.md)).

### Datos iniciales (`backend/data/permissions.json`, versionado)

```json
[
  { "role": "admin", "key": "can_get_score", "value": true },
  { "role": "admin", "key": "can_get_all_score", "value": true },
  { "role": "user", "key": "can_get_score", "value": true }
]
```

### Reglas de integridad nuevas (se suman a IR-1…IR-9 de la spec 006)

| Id    | Regla                                                   | Equivalente SQL |
| ----- | ------------------------------------------------------- | --------------- |
| IR-10 | `permissions (role, key)` único                         | PRIMARY KEY     |
| IR-11 | `permissions.role` debe existir en `roles.name`         | FOREIGN KEY     |
| IR-12 | `permissions.key` debe estar en el catálogo de permisos | CHECK           |

`permissions.json` también está sujeto a IR-1 (arreglo de objetos), IR-2 (columnas y tipos exactos, `value` booleano) e IR-3 (`role` y `key` no vacíos, sin espacios en los extremos).

## Requisitos

- RF-1: Modelo `permissions` e IR-10…IR-12, validados con el resto de los datos al arrancar y en recarga (falla cerrado), como define la spec 006.
- RF-2: Catálogo cerrado de permisos en `config/permissions.ts` (`can_get_score`, `can_get_all_score`), importable desde cualquier capa.
- RF-3: `permissions.service` expone `hasPermission(role, key)`: `true` solo si existe la fila `(role, key)` con `value: true`.
- RF-4: Middleware `authorize(check)` (`middlewares/authorize.middleware.ts`): recibe un **callback** `check(contexto)` y deja pasar solo si devuelve `true`. El contexto es plano (sin tipos de Express): `{ user, params, query }`.
- RF-5: El callback **se define en el service del recurso** (`<recurso>.service.ts`) y su único objetivo es validar si el usuario puede acceder al recurso solicitado. Los recursos triviales usan el helper `requirePermission(key)`, que arma un callback que solo exige un permiso.
- RF-6: `authorize` va después de `authenticate`: sin `req.user` responde `UNAUTHORIZED`; si el callback devuelve `false`, `FORBIDDEN`; si lanza un error, se propaga al manejador único ([012](012-errores-http.md)).
- RF-7: El rol y los permisos se evalúan con los datos vigentes en cada petición (el rol sale de `users.json`, como define la spec 007), por lo que un cambio rige sin reiniciar.
- RF-8: No hay callback por defecto permisivo: `authorize` exige el callback; no existe una ruta "abierta por omisión".

## Diseño

```
backend/
├── data/permissions.json                      # versionado
├── src/
│   ├── config/permissions.ts                  # PERMISSIONS, PermissionKey, isPermissionKey
│   ├── models/
│   │   ├── data.types.ts                      # + Permission, DataSnapshot.permissions
│   │   └── authorization.types.ts             # AuthorizationContext, AuthorizationCheck
│   ├── services/
│   │   ├── data-integrity.service.ts          # + permissions: IR-10…IR-12
│   │   ├── data-store.service.ts              # + permissions.json
│   │   └── permissions.service.ts             # hasPermission, requirePermission
│   └── middlewares/authorize.middleware.ts    # authorize(check)
└── test/                                       # espejo de src/
```

```ts
// en la ruta de un recurso
router.get('/:rut', authenticate, authorize(canGetScore), controller.getScore);   // callback del service
router.get('/algo', authenticate, authorize(requirePermission('can_get_score')), ...); // recurso trivial
```

Flujo: `authenticate` (deja `req.user`) → `authorize(check)` → controlador. El callback no conoce Express: recibe `{ user, params, query }`.

## Documentos RPI

- Research (constitution): [../research/011-rbac/constitution.md](../research/011-rbac/constitution.md)
- Plan: [../plan/011-rbac/plan.md](../plan/011-rbac/plan.md)
- Tasks: [../implementation/011-rbac/tasks.md](../implementation/011-rbac/tasks.md)
- Implement: [../implementation/011-rbac/implement.md](../implementation/011-rbac/implement.md)
- Prompt origen: [../prompts/2026-11-09_2045_011-012-013-errores-y-autorizacion.md](../prompts/2026-11-09_2045_011-012-013-errores-y-autorizacion.md)

## Specs relacionadas

- depende de: [006-modelo-datos](006-modelo-datos.md) — tabla `roles` y reglas de integridad que se amplían.
- depende de: [007-auth-jwt](007-auth-jwt.md) — `authenticate` y el usuario vigente con su rol.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — se implementa con TDD.
- depende de: [012-errores-http](012-errores-http.md) — `FORBIDDEN` y `UNAUTHORIZED` del mapa de errores.
- relacionada con: [013-consulta-score](013-consulta-score.md) — primer recurso con callback de autorización propio.

## Puntos abiertos

- **Formato de las claves:** se usan `can_get_score` y `can_get_all_score` (los nombres dados, en minúsculas y con guion bajo). Confirmar.
- **Semántica de `value`:** se interpreta como booleano de concesión. Si se prefiere que `value` sea otro dato (descripción, alcance), cambia el modelo.
- **Catálogo cerrado en código:** agregar un permiso exige cambiar `config/permissions.ts`; es deliberado, para que el callback de cada recurso conozca todas las claves posibles.
- **Roles sin permisos:** un rol sin filas no puede acceder a recursos protegidos con permisos; no hay "rol por defecto".

## Estado final (Converge)

Implementado con TDD en `feature/011-rbac` (workspace `D:\Persona-ws\011-rbac`): las pruebas se escribieron primero y se confirmó que fallaban (11 pruebas en rojo y 2 archivos sin compilar) antes de implementar. Resultado: 239 pruebas en verde (41 nuevas), `eslint`, `tsc` y `prettier --check` sin errores.

Verificado con el servidor compilado: arranca con `permissions.json` válido; con una clave fuera del catálogo (`"can get score"`) no arranca y informa IR-12.

Implementado:

- `config/permissions.ts`: catálogo cerrado (`can_get_score`, `can_get_all_score`), `PermissionKey`, `isPermissionKey`.
- Modelo: `permissions.json` (versionado) en el almacén de datos, con `IR-10` (clave primaria compuesta), `IR-11` (clave foránea a `roles`) e `IR-12` (catálogo); `DataSnapshot.permissions`.
- `permissions.service.ts`: `hasPermission(role, key)` (solo `value: true` concede) y `requirePermission(key)` para recursos triviales.
- `models/authorization.types.ts` y `middlewares/authorize.middleware.ts`: `authorize(check)` con contexto plano `{ user, params, query }`; sin `req.user` → 401, `false` (o cualquier valor distinto de `true`) → 403, error del callback → manejador único.

Notas:

- **No hay callback permisivo por defecto:** `authorize` exige el callback y solo concede con `true` estricto.
- El callback de un recurso con regla propia (score) se define en el service de ese recurso: spec [013-consulta-score](013-consulta-score.md).
- La spec [006](006-modelo-datos.md) tiene una nota de evolución con el modelo ampliado.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (006 con nota de evolución; 012 y 007 sin cambios)
- [x] índice `specs/README.md` actualizado
