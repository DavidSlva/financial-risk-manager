# Tasks — 011-rbac

Spec: [../../specs/011-rbac.md](../../specs/011-rbac.md) · Plan: [../../plan/011-rbac/plan.md](../../plan/011-rbac/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor.

- [x] T1 — `config/permissions.ts`: catálogo, `PermissionKey`, `isPermissionKey`
- [x] T2 — Modelo: tipo `Permission`, `DataSnapshot.permissions`, `permissions.json` en el almacén de datos; migrar los fixtures de pruebas
- [x] T3 — `data-integrity.service`: `permissions` con IR-1/2/3 y las nuevas IR-10, IR-11, IR-12
- [x] T4 — `permissions.service.ts`: `hasPermission` y `requirePermission`
- [x] T5 — `models/authorization.types.ts` y `authorize.middleware.ts`
- [x] T6 — `backend/data/permissions.json` (admin: ambos permisos; user: `can_get_score`)
- [x] T7 — Verificación: pruebas, lint, tipos, formato; arranque real con los datos
- [x] T8 — Converge: spec (estado final), `implement.md`, índice, spec 006 (nota de evolución), `CLAUDE.md` y `backend/README.md`
