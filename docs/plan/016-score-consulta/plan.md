# 016-score-consulta — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` para ejecutar este plan tarea por tarea. Los pasos usan casillas `- [ ]`.

**Objetivo:** construir la pantalla de consulta de score (RUT, botón, tarjeta de resultado) con cliente de API tipado, validación local de RUT, mapa de errores por status, textos en i18next y estilos con tokens, todo con pruebas Vitest. La conexión con la sesión y los scripts Playwright quedan diferidos (Tarea 4).

**Arquitectura:** `ScorePage` es el contenedor: valida con `normalizeRut`, llama a un `ScoreClient` inyectable y renderiza `ScoreResult` o un aviso. El cliente (`score.client.ts`) devuelve siempre un `ScoreOutcome` (nunca lanza salvo aborto) y elige la `messageKey` solo por status. Estilos en `score.css`, que consume `var(--...)`.

**Tecnologías:** React 19, i18next/react-i18next, Vitest con jsdom y Testing Library (sin dependencias nuevas).

**Spec:** [../../specs/016-score-consulta.md](../../specs/016-score-consulta.md) · Constitution: [../../research/016-score-consulta/constitution.md](../../research/016-score-consulta/constitution.md)

## Restricciones globales (valores de la spec)

- Node `>=22.22.0 <23`; pnpm; **no agregar dependencias** (`pnpm add` prohibido en este plan); `allowBuilds` vacío; cuarentena de 7 días; no tocar `pnpm-workspace.yaml` (spec 004).
- TDD: prueba que falla, verla fallar, código mínimo, verla pasar, refactor. Pruebas en `frontend/test/` espejo de `src/`, imports `../src/...`, sin globales de Vitest (importar `describe`, `it`, `expect`).
- Ningún componente con texto visible literal; todo por i18next (`es`). Ningún color, radio ni medida literal en CSS; solo `var(--...)` y tokens de `styles.config.ts` (si falta uno, agregarlo al config con su prueba). Reutilizar `Button` y `TextField`.
- Nada del RUT ni del score en `localStorage`, `sessionStorage`, URL ni `console`. El texto del cuerpo de los errores nunca se lee.
- Antes de cada commit: `pnpm run format:check`, `lint`, `typecheck`, `test`, `check:policy` y `pnpm --filter @financial-risk-manager/frontend run build`.
- Commits `tipo(016): descripción`, sin `--no-verify`. Trabajar solo en `D:\Persona-ws\016-score-consulta` (rama `feature/016-score-consulta`). Sin push ni PR.

## Interfaces fijas

`frontend/src/api/score.types.ts`:

```ts
export type ScoreSuccess = { kind: 'ok'; rut: string; score: number; fecha: string };
export type ScoreFailureReason =
  | 'invalid-rut'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'client-error'
  | 'server-error'
  | 'network'
  | 'malformed';
export type ScoreFailure = {
  kind: 'error';
  reason: ScoreFailureReason;
  status?: number;
  messageKey: string;
};
export type ScoreOutcome = ScoreSuccess | ScoreFailure;
export type ScoreClient = (
  rut: string,
  options?: { signal?: AbortSignal },
) => Promise<ScoreOutcome>;
```

| Razón                        | `messageKey`                  |
| ---------------------------- | ----------------------------- |
| `invalid-rut`                | `score.errors.invalidRut`     |
| `unauthorized`               | `score.errors.sessionExpired` |
| `forbidden`                  | `score.errors.forbidden`      |
| `not-found`                  | `score.errors.notFound`       |
| `client-error` (otro 4xx)    | `score.errors.clientError`    |
| `server-error` y `malformed` | `score.errors.serverError`    |
| `network`                    | `score.errors.network`        |

Otras firmas: `normalizeRut(raw: string): string | null`, `formatScoreDate(iso: string, timeZone?: string): string`, `SCORE_ERROR_KEYS: Record<ScoreFailureReason, string>`, `reasonForStatus(status: number): ScoreFailureReason`, `createScoreClient(fetchImpl?: typeof fetch): ScoreClient`, `fetchScore: ScoreClient`, `ScorePage({ client?, initialRut?, onSessionExpired? })`.

## Foco de revisión (casos que la spec no nombra y que más probablemente fallen)

1. **RUT con `K`/`k` y con ceros:** `1-9`, `11.111.111-1`, `k` minúscula y dígito verificador `0` (módulo 11 da 11, `0`) o `K` (da 10) (Tarea 1).
2. **Entradas basura al normalizar:** cadena vacía, solo espacios, letras, `--`, más de 9 dígitos, espacios internos (Tarea 1).
3. **Cuerpo `200` con tipos engañosos:** `score` como cadena `"73"`, `NaN`/`Infinity`, `rut: ''`, `fecha: 'ayer'`, cuerpo `null` o arreglo (Tarea 1).
4. **Cuerpo de error con texto del servidor:** el `messageKey` jamás deriva del cuerpo; un `403` con `{"error":"RUT no existe"}` sigue dando `score.errors.forbidden` (Tareas 1 y 3).
5. **Aborto:** `AbortError` se re-lanza (no se convierte en `network`) y `ScorePage` lo ignora (Tareas 1 y 3).
6. **Respuesta obsoleta:** consulta A pendiente, el usuario edita el RUT o envía B; la respuesta tardía de A no pinta nada (Tarea 3).
7. **Enter durante la carga** no reenvía; el botón no dispara durante `isLoading` (Tarea 3).
8. **Fecha inválida que llegue a la UI** no debe lanzar `RangeError` (el cliente ya la rechaza como `malformed`; `ScoreResult` no debe romper si llega igual) (Tareas 1 y 3).
9. **Llave inexistente o vacía en `es.json`:** una `messageKey` desconocida no rompe el render ni pinta una alerta vacía (Tarea 3).

## Estructura de archivos

| Archivo (bajo `frontend/`)       | Responsabilidad                                         |
| -------------------------------- | ------------------------------------------------------- |
| `src/lib/rut.ts`                 | `normalizeRut` (módulo 11)                              |
| `src/lib/format-score-date.ts`   | `formatScoreDate` con `Intl.DateTimeFormat('es-CL')`    |
| `src/config/score-errors.ts`     | `SCORE_ERROR_KEYS` y `reasonForStatus`                  |
| `src/api/score.types.ts`         | Tipos fijos del cliente                                 |
| `src/api/score.client.ts`        | `createScoreClient`, `fetchScore`                       |
| `src/i18n/es.json`               | Llaves `score.*`                                        |
| `src/components/ScoreResult.tsx` | Tarjeta de éxito o aviso                                |
| `src/pages/ScorePage.tsx`        | Formulario, estados, cancelación y respuestas obsoletas |
| `src/styles/score.css`           | Estilos con `var(--...)`                                |
| `test/**`                        | Pruebas espejo de `src/`                                |

---

### Tarea 1: RUT, fecha, mapa de errores y cliente de score

**Archivos:**

- Crear: `frontend/src/lib/rut.ts`, `frontend/src/lib/format-score-date.ts`, `frontend/src/config/score-errors.ts`, `frontend/src/api/score.types.ts`, `frontend/src/api/score.client.ts`
- Prueba: `frontend/test/lib/rut.test.ts`, `frontend/test/lib/format-score-date.test.ts`, `frontend/test/config/score-errors.test.ts`, `frontend/test/api/score.client.test.ts`

**Interfaces:**

- Produce: las firmas de "Interfaces fijas". No cambiarlas: otros agentes dependen de estos nombres.
- `normalizeRut`: acepta `12.345.678-9`, `12345678-9`, `123456789` (con o sin puntos y guion, `k`/`K`); devuelve `12345678-9` (sin puntos, `K` mayúscula) solo si el dígito verificador es válido; si no, `null`.
- `createScoreClient`: `GET /api/score/${encodeURIComponent(rut)}`, `credentials: 'include'`, `headers: { Accept: 'application/json' }`, `signal` si se pasa. `200`: validar JSON (`rut` texto no vacío, `score` número finito, `fecha` texto que `Date.parse` acepte) o `malformed`. No-200: `reasonForStatus(status)`; el cuerpo no se lee. `fetch` que lanza: `network`, salvo `AbortError`, que se re-lanza. Sin `console` ni almacenamiento.

- [ ] **Paso 1: Pruebas que fallan**
  - `rut.test.ts`: válidos con y sin formato, con `k` minúscula, dígito `0` y `K`; inválidos por dígito verificador, vacío, espacios, letras, demasiado corto o largo; salida canónica.
  - `format-score-date.test.ts`: `formatScoreDate('2025-06-27T14:35:00Z', 'UTC')` produce fecha larga y hora corta en `es-CL` (comparar con un `Intl.DateTimeFormat` de referencia y comprobar que contiene "junio" y "2025"); con `America/Santiago` cambia la hora; sin zona no lanza.
  - `score-errors.test.ts`: `reasonForStatus` para 400, 401, 403, 404, 418 (`client-error`), 500, 503; `SCORE_ERROR_KEYS` tiene una llave por cada razón con los valores de la tabla.
  - `score.client.test.ts` (con `fetchImpl` simulado): éxito con la respuesta de ejemplo; cada status (400, 401, 403, 404, 418, 500) con cuerpo hostil que no influye; `200` mal formado en todas las variantes del foco de revisión; red caída; `AbortError` re-lanzado; la petición lleva URL codificada, `credentials: 'include'`, `Accept` y `signal`; `localStorage` y `sessionStorage` quedan vacíos y `console` no se invoca (espías).
- [ ] **Paso 2: Ejecutar** `pnpm --filter @financial-risk-manager/frontend run test`. Esperado: FALLAN (módulos inexistentes). Registrar el fallo.
- [ ] **Paso 3: Implementar** el código mínimo de cada archivo, en el orden `rut`, `format-score-date`, `score.types`, `score-errors`, `score.client`, corriendo las pruebas de cada uno hasta verlas pasar.
- [ ] **Paso 4: Verificar** `format:check`, `lint`, `typecheck`, `test`, `check:policy` y `build` del frontend. Esperado: PASA.
- [ ] **Paso 5: Commit** — `feat(016): rut, fecha, mapa de errores y cliente de score`

---

### Tarea 2: Textos `score.*` en español

**Archivos:**

- Modificar: `frontend/src/i18n/es.json`
- Prueba: `frontend/test/i18n/score-i18n.test.ts`

**Interfaces:**

- Produce las llaves (textos exactos): `score.title` "Consulta tu score", `score.subtitle` (texto breve de ayuda; la spec no lo fija, p. ej. "Ingresa un RUT para ver su score."), `score.rut.label` "RUT", `score.submit` "Consultar", `score.submitting` "Consultando…", `score.date.label` "Fecha del score", y en `score.errors`: `invalidRut` "Ingresa un RUT válido.", `sessionExpired` "Tu sesión expiró. Vuelve a iniciar sesión.", `forbidden` "No tienes permiso para ver el score de este RUT.", `notFound` "No encontramos un score para este RUT.", `clientError` "No pudimos procesar la consulta. Revisa los datos e inténtalo de nuevo.", `serverError` "Tenemos un problema de nuestro lado. Inténtalo en unos minutos.", `network` "No pudimos conectar. Revisa tu conexión."

- [ ] **Paso 1: Prueba que falla:** cada llave devuelve su texto exacto (no la llave); cada valor de `SCORE_ERROR_KEYS` existe en `es.json` y no devuelve la propia llave.
- [ ] **Paso 2: Ejecutar.** Esperado: FALLA.
- [ ] **Paso 3: Implementar** agregando las llaves sin tocar las de `login.*`.
- [ ] **Paso 4: Verificar** el conjunto completo de comprobaciones. Esperado: PASA.
- [ ] **Paso 5: Commit** — `feat(016): textos del score en español`

---

### Tarea 3: `ScoreResult`, `ScorePage` y estilos

**Archivos:**

- Crear: `frontend/src/components/ScoreResult.tsx`, `frontend/src/pages/ScorePage.tsx`, `frontend/src/styles/score.css`
- Modificar: `frontend/src/config/styles.config.ts` solo si falta un token (con su prueba en `styles.config.test.ts`)
- Prueba: `frontend/test/components/ScoreResult.test.tsx`, `frontend/test/pages/ScorePage.test.tsx`, `frontend/test/styles/score.css.test.ts`

**Interfaces:**

- Consume: `ScoreClient`, `fetchScore`, `normalizeRut`, `formatScoreDate`, `Button`, `TextField`, llaves `score.*`.
- Produce:
  - `ScoreResult({ outcome: ScoreOutcome })`: éxito en tarjeta `role="status"` con el score grande, el RUT **tal como llega** y la fecha formateada con la etiqueta `score.date.label`; fallo en aviso `role="alert"` con `t(messageKey)`. Una `messageKey` vacía o desconocida no rompe el render.
  - `ScorePage({ client = fetchScore, initialRut = '', onSessionExpired }: { client?: ScoreClient; initialRut?: string; onSessionExpired?: () => void })`: título, subtítulo, `TextField` RUT, `Button` "Consultar" y tarjeta de resultado. Valida con `normalizeRut` antes de pedir (inválido: error de campo `score.errors.invalidRut`, sin petición, foco al campo). Pide con el RUT normalizado, bloquea el envío doble (botón en `isLoading`, campo `readOnly`, Enter ignorado), cancela con `AbortController` al editar el RUT o desmontar e ignora respuestas obsoletas. `unauthorized` llama `onSessionExpired` (sin pintar datos); `invalid-rut` del servidor se muestra como error de campo; `forbidden`, `not-found`, `client-error`, `server-error`, `malformed` y `network` muestran su mensaje en la tarjeta. Etiqueta asociada, `aria-invalid`, `aria-describedby`, orden de tabulación RUT, Consultar.
  - `score.css`: solo `var(--...)`, objetivos táctiles de `touchTarget`, mobile first desde 360 px, sin scroll horizontal, `prefers-reduced-motion` sin transiciones.

- [ ] **Paso 1: Pruebas que fallan**
  - `ScoreResult`: éxito con la respuesta de ejemplo (score `73`, RUT `12.345.678-9` sin reformatear, fecha con zona fija), `role="status"`; cada razón de fallo con `role="alert"` y su texto; `messageKey` desconocida sin lanzar; el texto del servidor no existe en el DOM.
  - `ScorePage`: reposo sin tarjeta; `initialRut` precargado; RUT inválido sin llamada al cliente y con `aria-invalid`; éxito; 403, 404, 5xx y red muestran su mensaje; 400 del servidor muestra error de campo; 401 llama `onSessionExpired`; carga con botón deshabilitado y "Consultando…"; segundo envío durante la carga ignorado (una sola llamada, también con Enter); respuesta tardía de una consulta obsoleta no reemplaza la actual; `AbortError` ignorado; el cliente recibe el RUT normalizado; `localStorage`, `sessionStorage`, `location` y `console` sin rastro del RUT ni del score.
  - `score.css.test.ts`: sin colores ni medidas literales fuera de media queries; todas las `var(--...)` existen entre las publicadas por `applyStyleTokens`.
  - `no-literal-text.test.ts` (ya existente): los nuevos `.tsx` pasan la heurística.
- [ ] **Paso 2: Ejecutar.** Esperado: FALLAN.
- [ ] **Paso 3: Implementar** `ScoreResult`, luego `ScorePage` y `score.css`, ejecutando las pruebas tras cada pieza hasta verlas pasar; agregar tokens al config (con prueba) solo si hacen falta.
- [ ] **Paso 4: Verificar** el conjunto completo de comprobaciones. Esperado: PASA.
- [ ] **Paso 5: Commit** — `feat(016): pantalla de consulta de score`

---

### Tarea 4 (diferida, pendiente): Sesión y Playwright

Depende de la spec 015 (sesión por cookies, RUT del usuario autenticado como `initialRut`, navegación al login con aviso de sesión vencida) y del andamiaje Playwright de la spec 014.

- [ ] Montar `ScorePage` en `App` tras el login y conectar `onSessionExpired` (limpia la sesión en memoria y vuelve al login con aviso) e `initialRut` (RF-3).
- [ ] Reemplazar `normalizeRut` por el validador compartido de la spec 015 si existe, conservando la interfaz.
- [ ] Scripts Playwright en `frontend/e2e/` con `page.route`: flujo feliz, 403, 404, 400, 401, 500 y red caída; 390 y 1280 px sin scroll horizontal; objetivos táctiles de 44 px; capturas por estado; la URL nunca contiene el RUT.
- [ ] Converge: `docs/implementation/016-score-consulta/{tasks,implement}.md`, estado final de la spec, índice `docs/specs/README.md`, `CLAUDE.md` y `frontend/README.md`.

---

## Autorrevisión

- **Cobertura de la spec:** RF-1, RF-2, RF-4, RF-5, RF-7, RF-8, RF-9, RF-10 y RF-11 (Tareas 1 a 3); RF-3 y RF-6 en su parte de sesión (Tarea 4, diferida; `onSessionExpired` e `initialRut` ya existen como props en la Tarea 3); pruebas Vitest de la spec (Tareas 1 a 3); Playwright (Tarea 4).
- **Consistencia de nombres:** `ScoreOutcome`, `ScoreClient`, `createScoreClient`, `fetchScore`, `normalizeRut`, `formatScoreDate`, `SCORE_ERROR_KEYS`, `reasonForStatus`, `ScoreResult`, `ScorePage` se definen una vez y se reutilizan igual.
- **Supuestos a validar:** la `fecha` obligatoria y `role="status"` en éxito son supuestos de la spec; el texto del subtítulo no está fijado por la spec; `normalizeRut` puede duplicar el validador de la 015 hasta integrar.
