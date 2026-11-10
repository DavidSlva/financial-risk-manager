---
id: 009-emision-tokens
title: Login con contraseña y emisión del primer par de tokens
status: tasked
created: 2026-11-09
updated: 2026-11-09
depends_on: [006-modelo-datos, 007-auth-jwt, 008-validador-rut, 010-tdd-vitest, 012-errores-http]
related: []
supersedes: []
superseded_by: []
---

# 009-emision-tokens — Login y emisión de tokens

## Resumen

El usuario incorpora una **contraseña** (guardada como hash) y se habilita `POST /api/auth/login`, que verifica `rut` + `password` y entrega el **primer par de tokens** (access + refresh) con el servicio de [007-auth-jwt](007-auth-jwt.md). Esta spec define el **contrato** de la ruta: entrada, salida y errores.

## Alcance

**Incluye:** columna de contraseña en `users` y su regla de integridad, hash y verificación de contraseñas, validador de la contraseña, `POST /api/auth/login` con su contrato, herramienta para generar el hash de una contraseña, pruebas.
**No incluye:** registro de usuarios, cambio o recuperación de contraseña, bloqueo por intentos fallidos (ver puntos abiertos), cierre de sesión / revocación de un refresh individual.

## Contrato de entrada

`POST /api/auth/login`, `Content-Type: application/json`:

```json
{ "rut": "12345678-5", "password": "una-clave-de-ejemplo" }
```

| Campo      | Tipo   | Obligatorio | Validación                                                                                                                   |
| ---------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `rut`      | string | sí          | Formato canónico con dígito verificador válido: `isValidRut` ([008-validador-rut](008-validador-rut.md)). Sin normalización. |
| `password` | string | sí          | Entre **8 y 128 caracteres** (puntos de código Unicode). No se recorta ni se normaliza; los espacios cuentan.                |

- **Estricto:** cualquier otro campo en el cuerpo invalida la petición.
- El `rut` debe llegar tal como se guarda: `12345678-5` (sin puntos, `K` en mayúscula). El frontend es responsable de enviarlo así.
- No hay reglas de composición (mayúsculas, símbolos): solo largo.

## Contrato de salida

`200 OK` con `Cache-Control: no-store`:

```json
{
  "accessToken": "<jwt>",
  "expiresIn": 900,
  "refreshToken": "<jwt>",
  "refreshExpiresIn": 604800
}
```

`expiresIn` y `refreshExpiresIn` son segundos y salen de la configuración ([007](007-auth-jwt.md)). La respuesta **nunca** incluye el hash ni datos del usuario.

## Errores

| Situación                                                          | Respuesta                    |
| ------------------------------------------------------------------ | ---------------------------- |
| Cuerpo ausente, no es un objeto JSON o es JSON malformado          | `400` `BAD_REQUEST`          |
| `rut` ausente, no es string, formato o dígito verificador inválido | `400` `BAD_REQUEST`          |
| `password` ausente, no es string o su largo está fuera de 8–128    | `400` `BAD_REQUEST`          |
| Campo adicional en el cuerpo                                       | `400` `BAD_REQUEST`          |
| `rut` no registrado                                                | `401` `UNAUTHORIZED`         |
| Contraseña incorrecta                                              | `401` `UNAUTHORIZED`         |
| Usuario no vigente (`active: false`), con cualquier contraseña     | `401` `UNAUTHORIZED`         |
| Datos no íntegros (spec 006)                                       | `500` genérico, nunca un 200 |

Los `401` son **idénticos** entre sí (mismo cuerpo, mismas cabeceras y mismo tiempo de respuesta aproximado): no revelan si el rut existe, si está vigente o si falló la contraseña. El contrato se valida (400) **antes** de tocar los datos.

## Cambio al modelo de datos

Se agrega una columna a `users` ([006-modelo-datos](006-modelo-datos.md)):

```sql
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL;
```

| Columna         | Tipo   | Nulo | Función                                                                                                                                 |
| --------------- | ------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `password_hash` | string | no   | **Hash** (nunca la contraseña) con el que se verifica el login. Formato `scrypt$N$r$p$<sal>$<hash>` (parámetros, sal y hash en base64). |

- Se guarda con **scrypt** de `node:crypto` (sin dependencias nuevas), sal aleatoria de 16 bytes y parámetros `N=2^15`, `r=8`, `p=3` (valores recomendados por OWASP), almacenados en el propio hash para poder subirlos en el futuro.
- **IR-14:** `users.password_hash` debe tener el formato `scrypt$N$r$p$<sal>$<hash>` válido. Se suma a IR-1…IR-13; `password_hash` entra en IR-2 (columnas exactas) e IR-3 (no vacío).
- `users.json` ya está fuera de git; ahora además contiene secretos (hashes), y así debe seguir.
- **El hash no sale del servicio de datos:** `req.user`, el contexto de autorización y cualquier respuesta usan `AuthenticatedUser` (`User` sin `password_hash`).

## Requisitos

- RF-1: `POST /api/auth/login` según el contrato de entrada, salida y errores anteriores.
- RF-2: `password.service` expone `isValidPassword(value)` (string de 8 a 128 caracteres), `hashPassword(password)` y `verifyPassword(password, hash)`. La política de largo vive en `config/password-policy.ts`.
- RF-3: `verifyPassword` usa comparación en tiempo constante y es asíncrona (no bloquea el bucle de eventos). Un hash mal formado verifica como `false`.
- RF-4: `auth.service.login(rut, password)`: busca al usuario; si no existe o no está vigente, **verifica igualmente** contra un hash señuelo para igualar el tiempo, y responde `UNAUTHORIZED`. Si la contraseña coincide, emite el par con `generateTokens`.
- RF-5: Orden: contrato (400) → datos y credenciales (401) → emisión (200).
- RF-6: Nunca se registra (log) ni se devuelve la contraseña ni el hash.
- RF-7: Herramienta `hash-password` para que un operador genere el hash de una contraseña y lo pegue en `users.json`: lee la contraseña por entrada estándar (no por argumento, para no quedar en el historial), aplica la misma validación de largo y solo imprime el hash.
- RF-8: `users.example.json` incluye `password_hash` de ejemplo (contraseña de ejemplo documentada).

## Diseño

```
backend/
├── scripts/hash-password.mjs                  # lee de stdin, imprime el hash
└── src/
    ├── config/password-policy.ts              # PASSWORD_POLICY { minLength: 8, maxLength: 128 }
    ├── models/data.types.ts                   # User + password_hash; AuthenticatedUser (sin hash)
    ├── services/
    │   ├── password.service.ts                # isValidPassword, hashPassword, verifyPassword
    │   ├── data-integrity.service.ts          # + IR-14 y password_hash en el esquema
    │   └── auth.service.ts                    # + login(); validate() devuelve AuthenticatedUser
    ├── controllers/auth.controller.ts         # + login: valida el contrato → 400
    └── routes/auth.routes.ts                  # + POST /login
```

Flujo: `POST /login` → controlador valida contrato (`isValidRut`, `isValidPassword`, sin campos extra) → `auth.service.login` → `users.service.findUserByRut` → `verifyPassword` → `token.service.generateTokens` → `200`.

## Documentos RPI

- Research (constitution): [../research/009-emision-tokens/constitution.md](../research/009-emision-tokens/constitution.md)
- Plan: [../plan/009-emision-tokens/plan.md](../plan/009-emision-tokens/plan.md)
- Tasks: [../implementation/009-emision-tokens/tasks.md](../implementation/009-emision-tokens/tasks.md)
- Implement: pendiente
- Prompt origen: [../prompts/2026-11-09_2101_008-009-contrato-login.md](../prompts/2026-11-09_2101_008-009-contrato-login.md)

## Specs relacionadas

- depende de: [006-modelo-datos](006-modelo-datos.md) — modelo de usuario que recibe `password_hash`.
- depende de: [007-auth-jwt](007-auth-jwt.md) — `generateTokens` y el resto del flujo de tokens.
- depende de: [008-validador-rut](008-validador-rut.md) — validación del `rut` de entrada.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — se implementa con TDD.
- depende de: [012-errores-http](012-errores-http.md) — `BAD_REQUEST` y `UNAUTHORIZED` del mapa de errores.

## Puntos abiertos

- **Largo de la contraseña (8–128):** supuesto. El máximo acota el costo del hash; confirmar ambos límites.
- **Campos adicionales (400):** se eligió un contrato estricto; confirmar.
- **Fuerza bruta:** no hay límite de intentos ni bloqueo. Es el principal riesgo de un login por contraseña; requiere una spec propia (limitador de tasa).
- **Contraseña inicial y su rotación:** solo se puede definir a mano (herramienta `hash-password` + `users.json`); no hay cambio ni recuperación por API.
- **Parámetros de scrypt:** `N=2^15, r=8, p=3` (~100 ms por verificación en un equipo actual); ajustar si el servidor es limitado.
- **Cierre de sesión:** el refresh se revoca solo poniendo `active: false` al usuario (spec 007); un logout por token queda fuera.

## Estado final (Converge)

Pendiente: la spec está en etapa `tasked`; falta implementar y hacer converge.
