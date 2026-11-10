---
id: 009-emision-tokens
title: Login con contraseña y emisión del primer par de tokens
status: converged
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

**Incluye:** columna de contraseña y contador de intentos fallidos en `users` y sus reglas de integridad, límite de intentos de login (máximo en la configuración), escritura atómica de `users.json`, hash y verificación de contraseñas, validador de la contraseña, `POST /api/auth/login` con su contrato, herramienta para generar el hash de una contraseña, pruebas.
**No incluye:** registro de usuarios, cambio o recuperación de contraseña, desbloqueo por API o por tiempo (ver puntos abiertos), cierre de sesión / revocación de un refresh individual.

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

| Situación                                                                                         | Respuesta                    |
| ------------------------------------------------------------------------------------------------- | ---------------------------- |
| Cuerpo ausente, no es un objeto JSON o es JSON malformado                                         | `400` `BAD_REQUEST`          |
| `rut` ausente, no es string, formato o dígito verificador inválido                                | `400` `BAD_REQUEST`          |
| `password` ausente, no es string o su largo está fuera de 8–128                                   | `400` `BAD_REQUEST`          |
| Campo adicional en el cuerpo                                                                      | `400` `BAD_REQUEST`          |
| `rut` no registrado                                                                               | `401` `UNAUTHORIZED`         |
| Contraseña incorrecta                                                                             | `401` `UNAUTHORIZED`         |
| Usuario no vigente (`active: false`), con cualquier contraseña                                    | `401` `UNAUTHORIZED`         |
| Usuario **bloqueado** (alcanzó el máximo de intentos fallidos), aunque la contraseña sea correcta | `401` `UNAUTHORIZED`         |
| No se pudo registrar el intento (error al escribir `users.json`)                                  | `500` genérico, nunca un 200 |
| Datos no íntegros (spec 006)                                                                      | `500` genérico, nunca un 200 |

Los `401` son **idénticos** entre sí (mismo cuerpo, mismas cabeceras y mismo tiempo de respuesta aproximado): no revelan si el rut existe, si está vigente o si falló la contraseña. El contrato se valida (400) **antes** de tocar los datos.

## Límite de intentos

Cada usuario tiene un contador de intentos fallidos de login (`failed_attempts`). El máximo se define en la configuración (`LOGIN_MAX_ATTEMPTS`, por defecto **5**).

- Un usuario está **bloqueado** cuando `failed_attempts >= LOGIN_MAX_ATTEMPTS`: el login se rechaza con el mismo `401`, **aunque la contraseña sea correcta**, y el contador deja de crecer.
- Cada intento **reserva** un lugar antes de verificar la contraseña: incrementa el contador de forma atómica y luego verifica. Así las peticiones concurrentes no pueden saltarse el límite.
- Un **login exitoso reinicia** el contador a 0.
- Solo cuentan los intentos sobre usuarios **existentes y vigentes**; un rut inexistente o no vigente no escribe nada.
- El **desbloqueo** es manual: un operador pone `failed_attempts` en 0 en `users.json`.
- La app **escribe** `users.json` (solo el contador). La escritura es atómica (archivo temporal + renombrado), serializada dentro del proceso, valida la integridad antes de escribir y reinicia la caché del almacén. Si no puede registrar el intento, responde `500` y no emite tokens.

## Cambio al modelo de datos

Se agrega una columna a `users` ([006-modelo-datos](006-modelo-datos.md)):

```sql
ALTER TABLE users ADD COLUMN password_hash   TEXT    NOT NULL;
ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0);
```

| Columna         | Tipo   | Nulo | Función                                                                                                                                 |
| --------------- | ------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `password_hash` | string | no   | **Hash** (nunca la contraseña) con el que se verifica el login. Formato `scrypt$N$r$p$<sal>$<hash>` (parámetros, sal y hash en base64). |

- `failed_attempts` (entero ≥ 0, sin nulos) es el **contador de intentos de login fallidos** del usuario. Lo escribe la app (ver _Límite de intentos_); empieza en 0.
- **IR-15:** `users.failed_attempts` debe ser un entero mayor o igual a 0. `failed_attempts` entra en IR-2 (columnas exactas).
- Se guarda con **scrypt** de `node:crypto` (sin dependencias nuevas), sal aleatoria de 16 bytes y parámetros `N=2^15`, `r=8`, `p=3` (valores recomendados por OWASP), almacenados en el propio hash para poder subirlos en el futuro.
- **IR-14:** `users.password_hash` debe tener el formato `scrypt$N$r$p$<sal>$<hash>` válido. Se suma a IR-1…IR-13 (más IR-15, abajo); `password_hash` entra en IR-2 (columnas exactas) e IR-3 (no vacío).
- `users.json` ya está fuera de git; ahora además contiene secretos (hashes), y así debe seguir.
- **El hash no sale del servicio de datos:** `req.user`, el contexto de autorización y cualquier respuesta usan `AuthenticatedUser` (`User` sin `password_hash` ni `failed_attempts`).

## Requisitos

- RF-1: `POST /api/auth/login` según el contrato de entrada, salida y errores anteriores.
- RF-2: `password.service` expone `isValidPassword(value)` (string de 8 a 128 caracteres), `hashPassword(password)` y `verifyPassword(password, hash)`. La política de largo vive en `config/password-policy.ts`.
- RF-3: `verifyPassword` usa comparación en tiempo constante y es asíncrona (no bloquea el bucle de eventos). Un hash mal formado verifica como `false`.
- RF-4: `auth.service.login(rut, password)`: busca al usuario; si no existe o no está vigente, **verifica igualmente** contra un hash señuelo para igualar el tiempo, y responde `UNAUTHORIZED`. Si la contraseña coincide, emite el par con `generateTokens`.
- RF-5: Orden: contrato (400) → datos y credenciales (401) → emisión (200).
- RF-6: Nunca se registra (log) ni se devuelve la contraseña ni el hash.
- RF-7: Herramienta `hash-password` para que un operador genere el hash de una contraseña y lo pegue en `users.json`: lee la contraseña por entrada estándar (no por argumento, para no quedar en el historial), aplica la misma validación de largo y solo imprime el hash.
- RF-8: `users.example.json` incluye `password_hash` de ejemplo (contraseña de ejemplo documentada).
- RF-9: Límite de intentos: máximo `LOGIN_MAX_ATTEMPTS` (entero positivo, por defecto 5) en `config/environment.ts`. Reserva atómica del intento antes de verificar; reinicio a 0 con un login exitoso; bloqueado ⇒ `401` idéntico.
- RF-10: El almacén de datos ofrece `updateUsers(…)`: escritura atómica (temporal + renombrado), serializada, que valida la integridad del resultado **antes** de escribir (si no es íntegro, no escribe y falla cerrado) y reinicia la caché.
- RF-11: Solo se escribe cuando hay cambio (no se reescribe `users.json` si el contador no cambia).

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
- Implement: [../implementation/009-emision-tokens/implement.md](../implementation/009-emision-tokens/implement.md)
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
- **Bloqueo permanente:** el bloqueo no vence con el tiempo y solo lo levanta un operador. Cualquiera que conozca un rut puede bloquear esa cuenta fallando `LOGIN_MAX_ATTEMPTS` veces (negación de servicio dirigida). Alternativas: bloqueo temporal, desbloqueo por API, limitar por IP además de por usuario.
- **Una sola instancia:** la escritura de `users.json` se serializa dentro del proceso; con varias instancias del backend no hay exclusión entre procesos.
- **Respuesta al bloqueo:** el usuario bloqueado recibe el mismo `401` (no se revela que existe ni que está bloqueado). Un `423`/`429` explícito mejoraría la experiencia a costa de revelar la cuenta.
- **Contraseña inicial y su rotación:** solo se puede definir a mano (herramienta `hash-password` + `users.json`); no hay cambio ni recuperación por API.
- **Parámetros de scrypt:** `N=2^15, r=8, p=3` (~100 ms por verificación en un equipo actual); ajustar si el servidor es limitado.
- **Cierre de sesión:** el refresh se revoca solo poniendo `active: false` al usuario (spec 007); un logout por token queda fuera.

## Estado final (Converge)

Implementado con TDD en `feature/009-emision-tokens` (workspace `D:\Persona-ws\009-emision-tokens`): en cada bloque las pruebas se escribieron primero y se confirmó que fallaban antes de implementar. Resultado: **516 pruebas en verde** (184 nuevas respecto a la 008; tres corridas completas seguidas), `eslint`, `tsc` y `prettier --check` sin errores.

Verificado con el servidor compilado (`LOGIN_MAX_ATTEMPTS=3`, hash generado con la herramienta): contrato inválido → 400 sin tocar el contador; 3 contraseñas incorrectas → 3 × 401 y contador 3 en `users.json`; con el usuario bloqueado, la contraseña **correcta** también da 401 y el contador no crece; otro usuario no se ve afectado; el access emitido sirve en `GET /api/score/:rut`; ninguna respuesta contiene el hash; poner el contador en 0 desbloquea.

Implementado:

- **Contrato:** `POST /api/auth/login` valida primero (objeto con exactamente `rut` y `password`; `isValidRut` de la spec 008 y `isValidPassword`, de 8 a 128 caracteres) → 400; luego credenciales → 401; luego 200 con `{ accessToken, expiresIn, refreshToken, refreshExpiresIn }` y `Cache-Control: no-store`.
- **Contraseñas:** `password.service` con `scrypt` de `node:crypto` (`N=2^15, r=8, p=3`, sal de 16 bytes, parámetros dentro del hash, comparación en tiempo constante, asíncrono, parámetros leídos del hash acotados). `config/password-policy.ts` con 8–128.
- **Modelo:** `password_hash` y `failed_attempts` en `users`; IR-14 (formato del hash; el mensaje nunca lo incluye) e IR-15 (entero ≥ 0). `AuthenticatedUser` (sin hash ni contador) en `req.user`, el contexto de autorización y `auth.service`.
- **Límite de intentos:** `LOGIN_MAX_ATTEMPTS` (por defecto 5) en `config/environment.ts`. `reserveLoginAttempt` incrementa **antes** de verificar (la concurrencia no elude el límite); `resetLoginAttempts` con un login exitoso. Bloqueado ⇒ el mismo 401.
- **Escritura de datos:** `data-store.updateUsers`: cola que serializa, valida la integridad del resultado **antes** de escribir, escritura atómica (temporal + renombrado), caché reiniciada, sin escribir si no hay cambio, falla cerrada.
- **Señuelo de tiempo:** cada intento cuesta una verificación de hash (rut inexistente, no vigente o bloqueado verifican contra un hash señuelo con los parámetros por defecto); lo comprueba una prueba que cuenta las verificaciones.
- **Herramienta:** `hash-password` (entrada estándar, entrada oculta en una terminal, misma validación de largo; imprime solo el hash). `users.example.json` con hashes de la contraseña de ejemplo `ejemplo-1234`.

Notas:

- Para el hash la contraseña se normaliza a NFKC, de modo que formas Unicode equivalentes (por ejemplo una `ñ` compuesta o descompuesta) sean la misma contraseña; el **largo** se mide sin normalizar, como define el contrato.
- `vitest.config.ts` sube el timeout de las pruebas a 30 s: algunas lanzan procesos y calculan hashes de costo real.
- El backend ahora **escribe** `users.json` (solo `failed_attempts`); la spec [006](006-modelo-datos.md) tiene una nota de evolución.
- `users.json` contiene secretos (hashes): sigue fuera de git y no debe copiarse a otros entornos.
- Quedan los puntos abiertos de arriba: bloqueo permanente (negación de servicio dirigida), una sola instancia y respuesta al bloqueo.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (006 y 007 con nota de evolución; 008 sin cambios; 013 sin cambios)
- [x] índice `specs/README.md` actualizado
