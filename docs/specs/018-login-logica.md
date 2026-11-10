---
id: 018-login-logica
title: Lógica del login (validación, /api/auth/login, sesión por cookies, errores por status)
status: implementing
created: 2026-11-09
updated: 2026-11-09
depends_on: [009-emision-tokens, 010-tdd-vitest, 012-errores-http, 017-login-ui]
related: [013-consulta-score, 019-score-consulta, 008-validador-rut, 014-cors-desarrollo]
supersedes: []
superseded_by: []
---

# 018-login-logica — Lógica del login

> Los puntos marcados **(supuesto)** son decisiones del agente, no del usuario. Esta spec conecta la interfaz de [017-login-ui](017-login-ui.md) con el login real del backend ([009-emision-tokens](009-emision-tokens.md), ya en `develop` con sesión por cookies). Reemplaza al borrador anterior, que se basaba en un mock.

## Resumen

La persona escribe su RUT y contraseña; el frontend los valida, llama a `POST /api/auth/login` y, si el backend responde `200`, pasa a la pantalla de score. La sesión viaja en **cookies `HttpOnly`** que fija el backend: el frontend no ve ni guarda los tokens. Los errores se muestran con mensajes claros elegidos **solo por el status HTTP**, desde un mapa llave → mensaje en i18next.

## Intención y anti-objetivos

- **Meta:** iniciar sesión sin ambigüedad: cada fallo dice qué pasó y qué hacer.
- **Anti-objetivos:** mostrar textos del servidor; guardar contraseña, RUT o tokens en el navegador (`localStorage`, `sessionStorage`, URL, consola); enviar la petición con datos que el contrato rechaza; permitir envíos dobles.

## Alcance

**Incluye:** validación local con límites en un archivo de configuración; cliente de login; estado de sesión en memoria; mapa de errores por status; conexión con `LoginForm`/`LoginPage` de 014; navegación al score; configuración de la URL base del API (desarrollo y producción); pruebas Vitest.
**No incluye:** cierre de sesión (el backend no tiene `logout` todavía), renovación de sesión (`/api/auth/refresh`), recuperar la sesión al recargar (no existe un endpoint que diga quién soy), recuperar contraseña, la pantalla de score ([019-score-consulta](019-score-consulta.md)), scripts Playwright de este flujo (quedan diferidos hasta integrar la infraestructura e2e de 014).

## Contrato real consumido (spec 009, versión con cookies)

`POST /api/auth/login`, `Content-Type: application/json` (**obligatorio**), cuerpo con **exactamente** dos campos:

```json
{ "rut": "12345678-5", "password": "..." }
```

- `rut`: formato canónico con dígito verificador válido (sin puntos, guion, `K` mayúscula). El frontend es responsable de enviarlo así.
- `password`: entre **8 y 128 caracteres** (puntos de código Unicode); no se recorta ni se normaliza; los espacios cuentan.
- Cualquier otro campo hace que el backend responda `400`.

| Status | Significado                                                                                                                                            | Mensaje del frontend (llave `login.errors.*`)                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `200`  | credenciales válidas. Cookies `access_token` y `refresh_token` (`HttpOnly`) en `Set-Cookie`; cuerpo `{ "expiresIn": 900, "refreshExpiresIn": 604800 }` | pasa a la pantalla de score                                                      |
| `400`  | cuerpo inválido (formato, largo o campo extra)                                                                                                         | `badRequest`: "Revisa los datos ingresados."                                     |
| `401`  | RUT inexistente, contraseña incorrecta, usuario no vigente o **bloqueado** (todos idénticos)                                                           | `invalidCredentials`: ver RF-6                                                   |
| `5xx`  | error del servidor                                                                                                                                     | `serverError`: "Tenemos un problema de nuestro lado. Inténtalo en unos minutos." |
| red    | sin respuesta                                                                                                                                          | `network`: "No pudimos conectar. Revisa tu conexión."                            |
| otro   | cualquier otro status (incl. `403`, `404`, `429` de un proxy)                                                                                          | `clientError` (4xx) o `serverError` (5xx) por defecto                            |

La respuesta de éxito **no incluye** datos del usuario: el frontend usa el RUT que la persona escribió (ya normalizado) como identidad de la sesión en memoria. El texto del campo `error` del servidor **nunca** se muestra.

## Requisitos

- RF-1: **Validación local previa** a cualquier petición, en este orden: RUT (`normalizeRut` → canónico con dígito verificador válido; si no, `login.errors.rutInvalid` en el campo RUT), contraseña vacía (`login.errors.passwordInvalid`), contraseña fuera de límites (`login.errors.passwordLength` con `{{passwordMin}}` y `{{passwordMax}}`). Un error local no hace petición y enfoca el primer campo con error.
- RF-2: Los **límites de tamaño** viven en un único archivo editable, `frontend/src/config/login-limits.ts`: RUT normalizado entre 9 y 10 caracteres; contraseña entre 8 y 128 puntos de código Unicode (`Array.from(value).length`, igual que el backend). Los mensajes y las validaciones leen de ahí; cambiar un valor no toca componentes.
- RF-3: **Petición:** `fetch` a `${API_BASE_URL}/auth/login` con `method: 'POST'`, `credentials: 'include'`, cabeceras `Content-Type: application/json` y `Accept: application/json`, y cuerpo `JSON.stringify({ rut: <canónico>, password: <tal como se escribió> })`: exactamente esos dos campos.
- RF-4: **URL base** en `frontend/src/config/api.config.ts`: `API_BASE_URL` sale de `import.meta.env.VITE_API_BASE_URL`, con `/api` por defecto (producción: mismo dominio que el backend). En desarrollo, `.env.development` define `VITE_API_BASE_URL=http://localhost:8000/api` y el servidor de Vite usa el puerto 3000 (origen permitido por `CORS_ORIGINS` de [014-cors-desarrollo](014-cors-desarrollo.md)); hay que usar `localhost` y no `127.0.0.1` (otro sitio: `SameSite=Strict` no enviaría las cookies).
- RF-5: **Éxito (`200`):** el cuerpo debe ser un objeto con `expiresIn` y `refreshExpiresIn` numéricos finitos; si no lo es, se trata como `serverError`. Con éxito se crea la **sesión en memoria** `{ rut: <canónico>, expiresAt: <ahora + expiresIn> }` (solo estado de React, nunca almacenamiento del navegador) y se navega a la pantalla de score.
- RF-6: **Mensaje del `401`:** "RUT o contraseña incorrectos. Revisa tus datos; si ya lo intentaste varias veces, tu cuenta puede estar bloqueada." **(supuesto)**. Es el mismo texto para todos los `401`, así que no revela si el RUT existe ni si está bloqueado.
- RF-7: **Mapa llave → mensaje** en `frontend/src/config/login-errors.ts` (status → llave) y los textos en `es.json` (`login.errors.*`); un status sin entrada usa el de su clase (4xx → `clientError`, 5xx → `serverError`). Se agrega también `429` → `tooManyRequests` ("Demasiados intentos. Espera unos minutos e inténtalo otra vez.") **(supuesto)**: hoy el backend no lo emite, pero un proxy podría.
- RF-8: Mientras hay una petición en curso: `isSubmitting` activo en `LoginForm`, sin segundo envío (ni con Enter ni con submit directo). Si el componente se desmonta durante la petición, se cancela con `AbortController` y no se actualiza estado.
- RF-9: Tras un `401` se **limpia la contraseña** y se conserva el RUT **(supuesto)**; el foco vuelve al campo de contraseña. Un error de campo o de formulario se borra cuando la persona edita el campo o vuelve a enviar.
- RF-10: **Navegación y sesión sin router (supuesto):** `App` guarda en memoria la pantalla actual (`login` | `score`) y la sesión. No hay rutas ni nada en la URL (el RUT nunca aparece en la barra). Mientras [019-score-consulta](019-score-consulta.md) no esté integrada, la pantalla `score` es un marcador mínimo que muestra el RUT de la sesión; al integrarla recibe `initialRut = session.rut` y, ante un `401`, `onSessionExpired` limpia la sesión y vuelve al login con el aviso `login.notices.sessionExpired` ("Tu sesión expiró. Vuelve a iniciar sesión.", `role="status"`). Recargar la página vuelve al login (no hay forma de recuperar la sesión sin un endpoint).
- RF-11: La contraseña y el RUT no se escriben en `localStorage`, `sessionStorage`, la URL ni la consola; los errores de red no se registran con sus datos.

## Pruebas

Con **TDD** ([010-tdd-vitest](010-tdd-vitest.md)); `frontend/test/` espeja `src/`.

- **Vitest:**
  - validación y límites: cada regla de RF-1 con sus bordes (RUT con DV incorrecto, vacío, 500 caracteres; contraseña de 7, 8, 128 y 129 puntos de código, incluido un carácter fuera del plano básico que cuenta como uno; solo espacios); los límites salen de `login-limits.ts` (cambiar la configuración cambia el resultado);
  - cliente de login: cuerpo con exactamente `rut` canónico y `password` tal cual (sin recortar), `Content-Type`, `credentials: 'include'`, URL con la base configurable; cada status (200, 400, 401, 403, 404, 429, 500, 503, otro 4xx), falla de red, `200` mal formado (sin `expiresIn`, no JSON), `AbortError`; nunca devuelve el texto del servidor; no toca el almacenamiento ni la consola;
  - mapa de errores: cada llave usada existe en `es.json`; un status sin entrada usa su clase;
  - `LoginPage`: envío feliz (llama al cliente una sola vez y reporta la sesión con el RUT canónico); error local sin petición; cada status muestra su mensaje; `401` limpia la contraseña y conserva el RUT; envío doble bloqueado (Enter y submit directo); desmontar cancela;
  - `App`: login exitoso → pantalla `score` con el RUT; la sesión solo vive en memoria (sin escrituras de almacenamiento); aviso de sesión expirada al volver.
- **Diferido (Playwright):** flujo completo contra `page.route` de `/api/auth/login` (cada status, éxito, red caída, cuerpo enviado exacto, envío doble) cuando la infraestructura e2e de 014 esté integrada. Prueba manual contra el backend real: login con el usuario de ejemplo y comprobación de que las cookies quedan `HttpOnly`.
- Se implementa con subagentes y revisión por tarea.

## Restricciones del repo

- Rama y workspace: `feature/018-login-logica` en `D:\Persona-ws\018-login-logica`; incluye el código de 014 (integrado desde `feature/017-login-ui`).
- pnpm y política de [004-pnpm-ci](004-pnpm-ci.md): sin dependencias nuevas.
- Commits `tipo(015): descripción`, sin saltarse hooks.

## Por definir

- **Cierre de sesión:** el backend no tiene `POST /api/auth/logout` y el frontend no puede borrar cookies `HttpOnly`; hasta entonces la sesión termina al caducar las cookies.
- **Recuperar la sesión al recargar:** requiere un endpoint (p. ej. `/api/auth/me`); sin él, recargar vuelve al login.
- **Utilidad de RUT compartida:** [019-score-consulta](019-score-consulta.md) también necesita `normalizeRut`; ambas ramas definen `frontend/src/lib/rut.ts` con la misma firma (`normalizeRut(raw: string): string | null`). Al integrar la segunda, se conserva una sola versión.
- **Numeración:** ya existe `014-cors-desarrollo`, igual prefijo que `017-login-ui`; conviene resolver la duplicidad de número antes de promover.

## Documentos RPI

- Research (constitution): [../research/018-login-logica/constitution.md](../research/018-login-logica/constitution.md)
- Plan: [../plan/018-login-logica/plan.md](../plan/018-login-logica/plan.md)
- Tasks: [../implementation/018-login-logica/tasks.md](../implementation/018-login-logica/tasks.md)
- Implement: [../implementation/018-login-logica/implement.md](../implementation/018-login-logica/implement.md)
- Prompt origen: [../prompts/2026-11-09_2103_017-login-ui.md](../prompts/2026-11-09_2103_017-login-ui.md)

## Specs relacionadas

- depende de: [009-emision-tokens](009-emision-tokens.md) — contrato real del login y sesión por cookies.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — TDD.
- depende de: [012-errores-http](012-errores-http.md) — status que el frontend traduce a mensajes.
- depende de: [017-login-ui](017-login-ui.md) — interfaz que esta spec conecta.
- relacionada con: [014-cors-desarrollo](014-cors-desarrollo.md) — origen y cookies en desarrollo; [019-score-consulta](019-score-consulta.md) — destino tras el login; [013-consulta-score](013-consulta-score.md); [008-validador-rut](008-validador-rut.md) — formato canónico del RUT.

## Estado final (parcial)

**Implementado** (commits `2e26c34`, `91f6407`): validación local con límites en `login-limits.ts` (RF-1, RF-2), cliente de login con cookies (RF-3), URL base configurable (RF-4), éxito con sesión en memoria (RF-5), mapa de errores por status (RF-6, RF-7), bloqueo de envío doble y cancelación (RF-8), limpieza de contraseña tras `401` (RF-9), navegación sin router y aviso de sesión expirada (RF-10), sin almacenamiento ni consola (RF-11). La spec se alineó con el código: los parámetros del mensaje de largo son `{{passwordMin}}` y `{{passwordMax}}`.

**Integración (rama `integration/login-score`, 2026-11-09):** `normalizeRut` unificado con el de 019 (una sola implementación en `lib/rut.ts`, ahora con recorte de espacios exteriores); `VITE_API_BASE_URL` vacía cae a `/api` (`||`); el temporizador de expiración se acota a 2147483647 ms y se rearma si el plazo es mayor; el marcador `ScorePlaceholder` y sus llaves `session.placeholder.*` se eliminaron porque tras el login `App` muestra `ScorePage` (spec 019). Probado de inicio a fin contra el backend real (login por cookies y consulta de score).

**Diferido:** Playwright e2e del flujo contra el backend; cierre de sesión; recuperar la sesión al recargar.

**Revisión final: aprobada, con hallazgos menores pendientes:**

- [x] `api.config.ts`: `VITE_API_BASE_URL` definida pero vacía no aplica el valor por defecto (`??`); usar `||` y agregar prueba.
- [x] `App.tsx`: el `setTimeout` de expiración no tiene tope; acotar a 2147483647 ms (hoy el backend da 900 s).
- `LoginPage.tsx`: el fallback usa la llave literal `login.errors.network` en vez de `LOGIN_ERROR_KEYS.network`; `login.notices.sessionExpired` en `App.tsx` también es literal.
- [x] `lib/rut.ts`: `normalizeRut` no recorta espacios exteriores (solo el RUT, nunca la contraseña); acepta puntos en cualquier posición (inofensivo).
- `login.client.test.ts` y `LoginPage`: faltan casos de `AbortError` lanzado por `response.json()`, cliente por defecto con el `fetch` global, comprobación de que la URL no contiene RUT ni contraseña, y una prueba de Enter para el envío doble.
- Tag de la spec: se asignará al promover.

**Revisión de documentos relacionados:**

- [ ] constitution actualizada
- [ ] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [ ] specs relacionadas revisadas
- [x] índice `specs/README.md` actualizado
