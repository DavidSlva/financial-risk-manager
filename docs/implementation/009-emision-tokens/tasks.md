# Tasks — 009-emision-tokens

Spec: [../../specs/009-emision-tokens.md](../../specs/009-emision-tokens.md) · Plan: [../../plan/009-emision-tokens/plan.md](../../plan/009-emision-tokens/plan.md)

Orden TDD en cada tarea: prueba que falla → código mínimo → refactor. Prerrequisito: spec 008 implementada (`isValidRut`).

- [ ] T1 — `config/password-policy.ts` y `isValidPassword` (límites 7/8/128/129, no string, Unicode)
- [ ] T2 — `hashPassword` y `verifyPassword` con scrypt (ida y vuelta, sal distinta, tiempo constante, hash mal formado → `false`)
- [ ] T3 — Modelo: `password_hash` en `User` y en el esquema de integridad; IR-14; migrar fixtures de pruebas con un hash de ejemplo de parámetros bajos
- [ ] T4 — `AuthenticatedUser` (sin hash) en `authenticate`, `auth.service` y el contexto de autorización; pruebas de que `req.user` no contiene el hash
- [ ] T5 — `auth.service.login` (éxito, rut inexistente, contraseña incorrecta, no vigente, datos corruptos; hash señuelo)
- [ ] T6 — `auth.controller.login` y `POST /login`: matriz de 400 del contrato, 401 indistinguibles, 200 con `Cache-Control: no-store`
- [ ] T7 — Prueba de extremo a extremo: el par emitido sirve en `POST /refresh` y en `GET /api/scores/:rut`
- [ ] T8 — `scripts/hash-password.mjs` (entrada estándar, misma validación de largo) y `users.example.json` con `password_hash`
- [ ] T9 — Verificación: pruebas, lint, tipos, formato; login real con el servidor compilado
- [ ] T10 — Converge: spec (estado final), `implement.md`, índice, specs 006 y 007 (nota de evolución), `CLAUDE.md` y `backend/README.md`
