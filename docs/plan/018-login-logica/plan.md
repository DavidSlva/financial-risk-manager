# 018-login-logica — Plan de implementación

> **Para agentes:** ejecutar tarea por tarea con TDD. Los pasos usan casillas `- [ ]`.

**Objetivo:** conectar la pantalla de login de 014 con el login real del backend: validación local, cliente de login, errores por status, sesión en memoria y paso a una pantalla de score (marcador).

**Arquitectura:** un núcleo sin UI (`lib/`, `config/`, `api/`, `session/`) y una capa de integración (`LoginPage`, `App`, i18n). El cliente es una función inyectable (`LoginClient`) para probar sin red. La sesión vive solo en el estado de `App`.

**Tecnologías:** las existentes (React 19, Vite, Vitest + jsdom, Testing Library, i18next). Sin dependencias nuevas.

**Spec:** [../../specs/018-login-logica.md](../../specs/018-login-logica.md) · Constitution: [../../research/018-login-logica/constitution.md](../../research/018-login-logica/constitution.md)

## Restricciones globales (valores de la spec)

- Node `>=22.22.0 <23`; pnpm; **sin `pnpm add`**; `pnpm-workspace.yaml` intacto (spec 004).
- TDD: prueba que falla → código mínimo → refactor. Pruebas en `frontend/test/` espejo de `src/`, imports `../src/...`, sin globales de Vitest.
- Petición: `POST ${API_BASE_URL}/auth/login`, `credentials: 'include'`, `Content-Type: application/json`, `Accept: application/json`, cuerpo `JSON.stringify({ rut, password })` con exactamente esos dos campos; `rut` canónico (`12345678-5`), `password` tal cual.
- Límites: RUT normalizado 9 a 10 caracteres; contraseña 8 a 128 puntos de código (`Array.from(v).length`); en `config/login-limits.ts`.
- `API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"` sin barra final; `.env.development` con `VITE_API_BASE_URL=http://localhost:8000/api`; Vite en puerto 3000 sin `strictPort`.
- Status: 200 ok (cuerpo con `expiresIn` y `refreshExpiresIn` numéricos finitos, si no `malformed`); 400 `badRequest`; 401 `invalidCredentials`; 429 `tooManyRequests`; otro 4xx `clientError`; >=500 y `malformed` `serverError`; red `network`. `AbortError` se relanza.
- Textos (es.json): `badRequest` "Revisa los datos ingresados."; `invalidCredentials` "RUT o contraseña incorrectos. Revisa tus datos; si ya lo intentaste varias veces, tu cuenta puede estar bloqueada."; `tooManyRequests` "Demasiados intentos. Espera unos minutos e inténtalo otra vez."; `clientError` "No pudimos procesar la solicitud. Revisa los datos e inténtalo de nuevo."; `serverError` "Tenemos un problema de nuestro lado. Inténtalo en unos minutos."; `network` "No pudimos conectar. Revisa tu conexión."; `passwordLength` "La contraseña debe tener entre {{passwordMin}} y {{passwordMax}} caracteres."; `login.notices.sessionExpired` "Tu sesión expiró. Vuelve a iniciar sesión."; `session.placeholder.title` "Sesión iniciada"; `session.placeholder.rut` "RUT".
- Contraseña, RUT y tokens nunca en `localStorage`/`sessionStorage`/URL/consola; el texto `error` del servidor jamás se muestra. Sin texto visible literal; sin colores/radios/medidas literales en CSS.
- Commits `tipo(015): descripción`, sin `--no-verify`; sin push ni PR.
- Antes de cada commit: `pnpm run format:check`, `lint`, `typecheck`, `test`, `check:policy` y `pnpm --filter @financial-risk-manager/frontend run build`.

## Foco de revisión

1. **Envío doble** por Enter y por submit directo mientras hay petición en curso (T2).
2. **Contraseña con carácter fuera del plano básico** (cuenta como un punto de código) y de solo espacios (no vacía, no se recorta) (T1).
3. **401 limpia la contraseña** sin tocar el RUT y devuelve el foco; los errores se borran al editar o reenviar (T2).
4. **Desmontar durante la petición**: se cancela y no hay actualización de estado ni `AbortError` mostrado (T2).
5. **Fugas**: ningún acceso a `localStorage`/`sessionStorage`/`console`; el texto del servidor nunca se renderiza (T1, T2).
6. **Retrocompatibilidad** de `LoginForm`/`TextField`/`PasswordField`/vista previa: las pruebas existentes (`no-literal-text`, `login.css`, preview) siguen verdes (T2).
7. **`rut.ts` compartido** con 016: misma firma, sin cambios de contrato (T1).

## Estructura de archivos

| Archivo (bajo `frontend/`)                                  | Responsabilidad                                             |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `src/api/login.types.ts`                                    | Tipos del resultado y del cliente de login                  |
| `src/api/login.client.ts`                                   | `createLoginClient`, `loginClient`                          |
| `src/config/{login-limits,api.config,login-errors}.ts`      | Límites, URL base, mapa razón → llave                       |
| `src/lib/{rut,validate-login}.ts`                           | `normalizeRut`, `validateLogin`                             |
| `src/session/session.types.ts`                              | Tipo `Session` (solo memoria)                               |
| `src/i18n/{index.ts,es.json}`                               | Llaves nuevas y `defaultVariables` de límites               |
| `src/components/{LoginForm,TextField,PasswordField}.tsx`    | Props opcionales mínimas                                    |
| `src/pages/{LoginPage,ScorePlaceholder}.tsx`, `src/App.tsx` | Lógica de la pantalla, marcador de score, estado en memoria |
| `.env.development`, `vite.config.ts`                        | URL del API en dev y puerto 3000                            |
| `test/**`                                                   | Pruebas Vitest, espejo de `src/`                            |

---

### Tarea 1: Núcleo (sin UI)

**Archivos:**

- Crear: `src/api/{login.types,login.client}.ts`, `src/config/{login-limits,api.config,login-errors}.ts`, `src/lib/{rut,validate-login}.ts`, `src/session/session.types.ts`, `.env.development`
- Modificar: `vite.config.ts` (`server.port: 3000`), `src/i18n/index.ts` (`interpolation.defaultVariables { passwordMin, passwordMax }` desde `LOGIN_LIMITS`), `src/i18n/es.json` (solo `passwordLength` aquí)
- Pruebas: `test/lib/rut.test.ts`, `test/lib/validate-login.test.ts`, `test/config/{login-limits,api.config,login-errors}.test.ts`, `test/api/login.client.test.ts`, ampliar `test/i18n/i18n.test.ts`

**Interfaces (fijas):**

- `login.types.ts`: `LoginSuccess { kind:'ok'; expiresIn; refreshExpiresIn }`, `LoginFailureReason` (`bad-request | unauthorized | too-many-requests | client-error | server-error | network | malformed`), `LoginFailure { kind:'error'; reason; status?; messageKey }`, `LoginOutcome`, `LoginCredentials`, `LoginClient(credentials, options?: { signal? }) => Promise<LoginOutcome>`.
- `LOGIN_LIMITS = { rut: { min: 9, max: 10 }, password: { min: 8, max: 128 } } as const`.
- `API_BASE_URL` y `apiUrl(path)` (una sola barra entre base y path).
- `normalizeRut(raw): string | null` (acepta puntos, guion, `k/K`; DV módulo 11; canónico o `null`).
- `LOGIN_ERROR_KEYS: Record<LoginFailureReason, string>` y `reasonForStatus(status)`.
- `validateLogin(values, limits = LOGIN_LIMITS)` → `{ ok: true; rut } | { ok: false; fieldErrors; firstInvalid }`; orden RUT primero; llaves `login.errors.rutInvalid | passwordInvalid | passwordLength`; contraseña sin recortar ni normalizar.
- `createLoginClient(fetchImpl?)` y `loginClient`; `Session { rut; expiresAt }`.

- [ ] **Paso 1: Pruebas que fallan**
  - `rut`: `12.345.678-5`, `123456785` y `12345678-5` dan `12345678-5`; `k`/`K` válidos dan `K`; DV incorrecto, vacío, letras y 500 caracteres dan `null`.
  - `validate-login`: RUT inválido o fuera de límites; contraseña vacía; 7, 8, 128 y 129 puntos de código; carácter fuera del plano básico cuenta uno; solo espacios (8 espacios es válida, no se recorta); orden RUT primero con `firstInvalid`; pasar otros límites cambia el resultado.
  - `login-limits` / `api.config`: valores exactos; `apiUrl('/auth/login')` con base con y sin barra final.
  - `login-errors`: cada razón mapea su llave; `reasonForStatus` para 400, 401, 429, 403, 404, 418, 500, 503. La existencia de cada llave en `es.json` se comprueba en T2, cuando el archivo está completo.
  - `login.client` (con `fetch` simulado): URL, método, `credentials: 'include'`, cabeceras, cuerpo con exactamente `rut` y `password` tal cual, `signal`; 200 válido, 200 sin `expiresIn`, 200 no JSON y 200 con valores no numéricos o no finitos (`malformed`); 400, 401, 403, 404, 429, 500, 503 y otro 4xx con `reason`, `status` y `messageKey`; el texto del servidor no aparece en el resultado; `fetch` que lanza da `network`; `AbortError` se relanza; espías confirman que no se toca `localStorage`, `sessionStorage` ni `console`.
  - `i18n`: `t('login.errors.passwordLength')` usa `LOGIN_LIMITS` (al mutar un límite cambia el texto tras reinicializar).
- [ ] **Paso 2: Ejecutar** `pnpm --filter @financial-risk-manager/frontend run test`. Esperado: FALLAN (módulos inexistentes).
- [ ] **Paso 3: Implementar** el código mínimo con las interfaces fijas; `.env.development`; puerto 3000 sin `strictPort`.
- [ ] **Paso 4: Verificar** la lista completa de comandos de "Restricciones globales". Esperado: PASA.
- [ ] **Paso 5: Commit** — `feat(015): núcleo de la lógica del login (validación, cliente, errores y config)`

---

### Tarea 2: Integración (LoginPage, App, i18n, marcador de score)

**Archivos:**

- Crear: `src/pages/ScorePlaceholder.tsx`
- Modificar: `src/i18n/es.json` (llaves restantes), `src/components/{LoginForm,TextField,PasswordField}.tsx` (solo props opcionales), `src/pages/LoginPage.tsx`, `src/App.tsx`, `src/styles/login.css` (solo `var(--…)`) si hace falta para el aviso
- Pruebas: `test/pages/LoginPage.test.tsx`, `test/pages/ScorePlaceholder.test.tsx`, `test/App.test.tsx`, ampliar `test/components/LoginForm.test.tsx` y `test/config/login-errors.test.ts` (existencia de llaves)

**Interfaces:**

- `LoginPage({ client?: LoginClient; onLoggedIn?: (session: Session) => void; noticeKey?: string; now?: () => number })` (cliente por defecto `loginClient`; `now` por defecto `Date.now`).
- `LoginForm`: props opcionales nuevas `onFieldEdit?(field: 'rut' | 'password'): void`, `resetPasswordSignal?: number` (al cambiar limpia la contraseña y la enfoca) y `focusField?: { field: 'rut' | 'password'; nonce: number }` (enfoca el primer campo con error). `TextField`/`PasswordField`: `inputRef` opcional. Sin props nuevas, el comportamiento es idéntico al de 014.
- Aviso: `<p role="status">` con `t(noticeKey)` sobre el formulario si `noticeKey` no es vacío.
- `ScorePlaceholder({ rut })` con `session.placeholder.title` y `session.placeholder.rut`.
- `App({ loginClient?: LoginClient; now?: () => number })`: estado en memoria `{ screen: 'login' | 'score'; session; notice }`; sin router ni nada en la URL; `/dev/login-states` sigue funcionando; `onLoggedIn` pasa a `score` con la sesión; volver al login fija el aviso `login.notices.sessionExpired`.

- [ ] **Paso 1: Pruebas que fallan**
  - `LoginPage`: envío feliz (cliente simulado llamado una vez con `{ rut canónico, password }`; `onLoggedIn` recibe `{ rut, expiresAt = now() + expiresIn*1000 }`); error local sin petición y con foco en el primer campo inválido; cada resultado (`400`, `401`, `403`, `429`, `500`, red, `malformed`) muestra su mensaje en `role="alert"` y nunca el texto del servidor; `401` limpia la contraseña, conserva el RUT y enfoca la contraseña; errores de campo y de formulario se borran al editar o reenviar; `isSubmitting` mientras la promesa está pendiente; envío doble bloqueado con Enter y con submit directo (el cliente se llama una vez); desmontar durante la petición aborta la señal y no actualiza estado ni llama `onLoggedIn`; `noticeKey` muestra `role="status"`.
  - `LoginForm`: sin las props nuevas todo igual; con ellas, `onFieldEdit` se dispara al escribir, `resetPasswordSignal` limpia y enfoca, `focusField` enfoca.
  - `ScorePlaceholder`: muestra título y el RUT recibido.
  - `App`: login exitoso (cliente simulado) → pantalla con el RUT; sin escrituras en `localStorage`/`sessionStorage` ni cambios en `location`; volver al login muestra el aviso `sessionExpired`; la vista previa `/dev/login-states` sigue renderizando.
  - `es.json`: cada llave de `LOGIN_ERROR_KEYS`, `login.notices.sessionExpired` y `session.placeholder.*` existe con los textos exactos de "Restricciones globales".
- [ ] **Paso 2: Ejecutar.** Esperado: FALLAN.
- [ ] **Paso 3: Implementar** el mínimo: llaves de `es.json`; extensiones opcionales de los componentes; `LoginPage` con `validateLogin`, `AbortController` por petición (y abort al desmontar), bandera de envío en `useRef` además de `isSubmitting`; `ScorePlaceholder`; `App` con el estado en memoria. No modificar pruebas existentes salvo ampliarlas.
- [ ] **Paso 4: Verificar** que `no-literal-text`, `login.css` y la vista previa siguen verdes, más la lista completa de comandos de "Restricciones globales" (incluido el build). Esperado: PASA.
- [ ] **Paso 5: Commit** — `feat(015): login conectado al backend con sesión en memoria`

---

### Tarea 3: Playwright y prueba manual (diferida, pendiente)

- [ ] Playwright e2e del flujo con `page.route` sobre `/api/auth/login` (cada status, éxito, red caída, cuerpo exacto, envío doble) cuando la infraestructura e2e de 014 esté integrada.
- [ ] Prueba manual contra el backend real: login con el usuario de ejemplo y cookies `access_token` y `refresh_token` con `HttpOnly`, usando `http://localhost:3000`.
- [ ] Converge: `tasks.md`, `implement.md`, estado final de la spec, índice y `CLAUDE.md` (sección Frontend).

---

## Autorrevisión

- **Cobertura de la spec:** RF-1/RF-2 (T1), RF-3/RF-4 (T1), RF-5 (T1, T2), RF-6/RF-7 (T1, T2), RF-8/RF-9 (T2), RF-10 (T2), RF-11 (T1, T2); Playwright y prueba manual diferidos (T3).
- **Consistencia de nombres:** las interfaces fijas (`LoginClient`, `LoginOutcome`, `LOGIN_LIMITS`, `apiUrl`, `normalizeRut`, `LOGIN_ERROR_KEYS`, `reasonForStatus`, `validateLogin`, `createLoginClient`, `Session`) se definen una vez en T1 y se reutilizan igual en T2.
- **Supuestos a validar:** textos de `401`, `429` y demás; nombres de las props opcionales nuevas de `LoginForm`; `rut.ts` se reconcilia con 016 al integrar la segunda rama.
