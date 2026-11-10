# 014-login-ui — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (método elegido por el usuario) para ejecutar este plan tarea por tarea. Los pasos usan casillas `- [ ]`.

**Objetivo:** construir la pantalla de login (solo presentación, tema claro, mobile first) con valores de diseño en un archivo de configuración, textos en i18next, pruebas Vitest y scripts Playwright.

**Arquitectura:** SPA React + Vite. `config/styles.config.ts` es la fuente única de valores de diseño y `applyStyleTokens()` los publica como variables CSS; `login.css` solo consume `var(--…)`. `LoginForm` es puramente presentacional: estados por props, sin red ni validación. Una vista previa de estados, solo en desarrollo, sirve para revisión visual y para Playwright.

**Tecnologías:** React, React DOM, Vite, `@vitejs/plugin-react`, i18next, react-i18next, Vitest con jsdom y Testing Library, Playwright.

**Spec:** [../../specs/014-login-ui.md](../../specs/014-login-ui.md) · Constitution: [../../research/014-login-ui/constitution.md](../../research/014-login-ui/constitution.md)

## Restricciones globales (valores de la spec)

- Node `>=22.22.0 <23`; pnpm (`packageManager`); dependencias solo con `pnpm add`; `allowBuilds` vacío; cuarentena de 7 días; no debilitar `pnpm-workspace.yaml` (spec 004).
- TDD: prueba que falla → código mínimo → refactor. Pruebas en `frontend/test/` espejo de `src/`, nombre `<recurso>.<capa>.test.tsx`, imports `../src/...`, sin globales de Vitest (importar `describe`, `it`, `expect`).
- Colores: `background #fafafa`, `surface #ffffff`, `border #eaeaea`, `borderFocus #000000`, `text #000000`, `textMuted #666666`, `textDisabled #999999`, `danger #cd2b31`, `buttonBackground #000000`, `buttonText #ffffff`. Radios: `field` 6 px, `card` 12 px.
- Tamaños: `touchTarget` 44, `cardMaxWidth` 400, `mobileGutter` 24, `cardBreakpoint` 480, `borderWidth` 1; espaciado de 4 px; `transitionDuration` 150 ms. Diseño desde 360 px; sin scroll horizontal en 360, 390, 768 y 1280 px.
- Tipografía: pila `system-ui, -apple-system, "Segoe UI", sans-serif`, sin fuentes externas; título 22/600, subtítulo 13, etiquetas 12/500, campos y botón 14, errores 12; campos de texto en móvil ≥ 16 px.
- Ningún componente contiene texto visible literal; todo sale de i18next (`es`). Ningún componente ni `login.css` contiene colores, radios ni medidas literales (excepto el breakpoint de `login.css`, que debe coincidir con `sizes.cardBreakpoint`).
- Sin `localStorage`/`sessionStorage`; sin llamadas de red; sin backend.
- Commits: `tipo(014): descripción`, sin `--no-verify`. Trabajar solo en `D:\Persona-ws\014-login-ui` (rama `feature/014-login-ui`). Push, tags y PRs requieren confirmación del usuario.

## Foco de revisión (casos que la spec no nombra y que más probablemente fallen)

1. **Envío doble por teclado:** pulsar Enter con `isSubmitting` activo no vuelve a llamar a `onSubmit` (Tarea 5).
2. **Mensaje de error vacío:** `formErrorKey` o una llave de campo vacía (`''`) no deben pintar una alerta vacía; una llave inexistente en `es.json` no debe romper el render (Tarea 5).
3. **Valor muy largo pegado en un campo** (p. ej. 500 caracteres): no genera scroll horizontal ni rompe la tarjeta (Tarea 7).
4. **Ancho extremo de 320 px y zoom del navegador al 200 %:** nada se corta ni se solapa (Tarea 7).
5. **`prefers-reduced-motion`:** con la preferencia activa no hay transiciones (Tarea 7).

## Estructura de archivos

| Archivo (bajo `frontend/`)                                      | Responsabilidad                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `index.html`, `vite.config.ts`                                  | Entrada de Vite y plugin de React                                 |
| `src/config/styles.config.ts`                                   | Valores de diseño tipados y de solo lectura                       |
| `src/styles/apply-tokens.ts`                                    | `applyStyleTokens()`: publica la configuración como variables CSS |
| `src/styles/login.css`                                          | Estilos del login; solo `var(--…)` y el breakpoint                |
| `src/i18n/index.ts`, `src/i18n/es.json`                         | Inicialización de i18next y textos en español                     |
| `src/components/{Button,TextField,PasswordField,LoginForm}.tsx` | Componentes de presentación                                       |
| `src/pages/LoginPage.tsx`, `src/pages/LoginStatesPreview.tsx`   | Pantalla y vista previa de estados (solo desarrollo)              |
| `src/App.tsx`, `src/main.tsx`, `src/resolve-screen.ts`          | Arranque, aplicación de tokens y elección de pantalla             |
| `e2e/*.spec.ts`, `playwright.config.ts`                         | Scripts Playwright                                                |
| `test/**`                                                       | Pruebas Vitest, espejo de `src/`                                  |

---

### Tarea 1: Andamiaje de Vite, React, i18next y entorno de pruebas

**Archivos:**

- Crear: `frontend/index.html`, `frontend/vite.config.ts`, `frontend/test/setup.test.ts`
- Modificar: `frontend/package.json` (dependencias y scripts `dev`, `build`, `preview`), `frontend/vitest.config.ts` (entorno `jsdom`), `frontend/tsconfig.json` (`types` y `include` si hace falta), `frontend/src/main.tsx`, `pnpm-lock.yaml`

**Interfaces:**

- Produce: `pnpm --filter @financial-risk-manager/frontend run build` y `run dev` operativos; Vitest con DOM y `@testing-library/react` disponibles para las tareas siguientes.

- [ ] **Paso 1: Prueba que falla** — `frontend/test/setup.test.ts`: `it('entorno de pruebas tiene DOM', …)` espera `typeof document !== 'undefined'` y que `document.createElement('div')` sea un `HTMLDivElement`.
- [ ] **Paso 2: Ejecutar** `pnpm --filter @financial-risk-manager/frontend run test`. Esperado: FALLA (entorno `node`).
- [ ] **Paso 3: Instalar dependencias** con `pnpm add` en el workspace frontend: `react`, `react-dom`, `i18next`, `react-i18next`; y como dev `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/dom`. Si la cuarentena bloquea una versión, elegir otra madura; no tocar `pnpm-workspace.yaml`. Verificar con `pnpm run check:policy`.
- [ ] **Paso 4: Configurar** `environment: 'jsdom'` en `vitest.config.ts` y retirar `passWithNoTests` (RF-8 de la spec 010); `vite.config.ts` con el plugin de React; `index.html` con `<div id="root">` y `<html lang="es">`; `main.tsx` monta un `<div>` provisional; scripts `dev`, `build` (`vite build`), `preview`.
- [ ] **Paso 5: Verificar** `pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`, `pnpm --filter @financial-risk-manager/frontend run build`. Esperado: todo pasa y `dist/` contiene `index.html` con archivos hasheados.
- [ ] **Paso 6: Commit** — `chore(014): andamiaje de vite, react e i18next`

---

### Tarea 2: Configuración de estilos y `applyStyleTokens`

**Archivos:**

- Crear: `frontend/src/config/styles.config.ts`, `frontend/src/styles/apply-tokens.ts`
- Prueba: `frontend/test/config/styles.config.test.ts`, `frontend/test/styles/apply-tokens.test.ts`

**Interfaces:**

- Produce:
  - `styles` (objeto `as const`, solo lectura) con grupos `colors`, `radius`, `typography`, `sizes`, `spacing`, `motion` y las claves de la spec.
  - `type StylesConfig = typeof styles`.
  - `toCssVarName(group: string, key: string): string` → `--<grupo>-<clave en kebab-case>` (`('colors','textMuted')` → `--colors-text-muted`).
  - `applyStyleTokens(config?: StylesConfig, root?: HTMLElement): void` (por defecto `styles` y `document.documentElement`); escribe cada valor como variable CSS; los números se publican con `px` salvo `motion.transitionDuration` (`ms`) y los pesos de fuente (sin unidad).

- [ ] **Paso 1: Pruebas que fallan**
  - `styles.config.test.ts`: los diez colores y los dos radios tienen exactamente los valores de "Restricciones globales"; `sizes.touchTarget === 44`, `sizes.cardMaxWidth === 400`, `sizes.cardBreakpoint === 480`.
  - `apply-tokens.test.ts`: tras `applyStyleTokens()`, `--colors-danger` vale `#cd2b31` y `--radius-card` vale `12px`; cada clave de cada grupo queda publicada; llamar con una configuración modificada (`colors.danger = '#f00'`) cambia la variable publicada; `toCssVarName('colors','textMuted') === '--colors-text-muted'`.
- [ ] **Paso 2: Ejecutar** `pnpm --filter @financial-risk-manager/frontend run test`. Esperado: FALLA (módulos inexistentes).
- [ ] **Paso 3: Implementar** los dos archivos con las firmas de Interfaces; recorrer los grupos de forma genérica (sin una línea por variable).
- [ ] **Paso 4: Verificar** pruebas, `typecheck`, `lint`, `format:check`. Esperado: PASA.
- [ ] **Paso 5: Commit** — `feat(014): configuración de estilos y publicación como variables css`

---

### Tarea 3: i18next y textos en español

**Archivos:**

- Crear: `frontend/src/i18n/index.ts`, `frontend/src/i18n/es.json`
- Prueba: `frontend/test/i18n/i18n.test.ts`

**Interfaces:**

- Produce: `initI18n(): i18n` (idioma `es`, `fallbackLng: 'es'`, `escapeValue: false`, devuelve la instancia ya inicializada) y `es.json` con estas llaves (valores en español de la spec): `login.title` "Iniciar sesión", `login.subtitle` "Ingresa tu RUT y contraseña para ver tu score.", `login.rut.label` "RUT", `login.rut.placeholder` "12345678-K", `login.password.label` "Contraseña", `login.password.show` "Mostrar", `login.password.hide` "Ocultar", `login.submit` "Continuar", `login.submitting` "Ingresando…", `login.errors.invalidCredentials` "RUT o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.", `login.errors.rutInvalid` "Ingresa un RUT válido.", `login.errors.passwordInvalid` "Ingresa tu contraseña.". Las llaves de error son ejemplos para la vista previa; la spec 015 agrega las suyas.

- [ ] **Paso 1: Prueba que falla** — `initI18n().t('login.title')` es "Iniciar sesión"; cada llave de Interfaces devuelve su texto exacto (no la propia llave); `t('login.noExiste')` devuelve la llave sin lanzar.
- [ ] **Paso 2: Ejecutar** la prueba. Esperado: FALLA.
- [ ] **Paso 3: Implementar** `initI18n()` con `react-i18next` (`initReactI18next`) y `resolveJsonModule`; sin detección de idioma del navegador (solo `es` por ahora).
- [ ] **Paso 4: Verificar** pruebas, `typecheck`, `lint`, `format:check`. Esperado: PASA.
- [ ] **Paso 5: Commit** — `feat(014): infraestructura i18next con textos en español`

---

### Tarea 4: Componentes `Button`, `TextField` y `PasswordField`

**Archivos:**

- Crear: `frontend/src/components/Button.tsx`, `TextField.tsx`, `PasswordField.tsx`
- Prueba: `frontend/test/components/{Button,TextField,PasswordField}.test.tsx`

**Interfaces:**

- Consume: `initI18n()` (Tarea 3). Las pruebas envuelven con `I18nextProvider`.
- Produce:
  - `Button({ children, isLoading?: boolean, type?: 'button'|'submit', disabled?: boolean, onClick? })`: con `isLoading` queda deshabilitado, muestra un indicador (`aria-busy="true"`) y no dispara `onClick`.
  - `TextField({ id, label, value, onChange, errorKey?: string, hintKey?: string, readOnly?: boolean, inputMode?, autoComplete?, autoCapitalize?, placeholder?, type? })`: `<label htmlFor>`; con `errorKey` válido (no vacío) agrega `aria-invalid="true"`, enlaza `aria-describedby` con el mensaje (`t(errorKey)`) y aplica la clase de error; sin `errorKey` o con `''` no renderiza mensaje.
  - `PasswordField(props de TextField menos type)`: botón "Mostrar/Ocultar" (`t('login.password.show'|'hide')`, `aria-pressed`, `type="button"`) que alterna `type` entre `password` y `text`. El botón está en el orden de tabulación después del campo.
- Los componentes usan solo clases CSS (definidas en la Tarea 5); sin estilos en línea ni textos literales.

- [ ] **Paso 1: Pruebas que fallan** — por componente: (a) `Button` con `isLoading` no llama a `onClick` y expone `aria-busy`; (b) `TextField` asocia etiqueta y campo (`getByLabelText`), con `errorKey="login.errors.rutInvalid"` expone `aria-invalid` y `aria-describedby` apuntando a un elemento con el texto "Ingresa un RUT válido.", con `errorKey=""` no hay mensaje; (c) `PasswordField` parte en `type="password"`, un clic en "Mostrar" pasa a `type="text"` y el botón dice "Ocultar", otro clic vuelve a `password`.
- [ ] **Paso 2: Ejecutar** las pruebas. Esperado: FALLAN.
- [ ] **Paso 3: Implementar** los tres componentes con las firmas de Interfaces; `PasswordField` reutiliza `TextField`.
- [ ] **Paso 4: Prueba de textos** `frontend/test/components/no-literal-text.test.ts`: lee los `.tsx` de `src/components` y `src/pages` y falla si encuentra texto JSX literal con letras (heurística: contenido entre `>` y `<` que no sea una expresión `{…}`); debe pasar con lo implementado.
- [ ] **Paso 5: Verificar** pruebas, `typecheck`, `lint`, `format:check`. Esperado: PASA.
- [ ] **Paso 6: Commit** — `feat(014): componentes button, textfield y passwordfield`

---

### Tarea 5: `LoginForm`, `LoginPage`, estilos y arranque

**Archivos:**

- Crear: `frontend/src/components/LoginForm.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/styles/login.css`, `frontend/src/App.tsx`
- Modificar: `frontend/src/main.tsx` (llama `initI18n()` y `applyStyleTokens()` antes de montar `App`)
- Prueba: `frontend/test/components/LoginForm.test.tsx`, `frontend/test/styles/login.css.test.ts`

**Interfaces:**

- Consume: `Button`, `TextField`, `PasswordField`, `styles`, `applyStyleTokens`, llaves `login.*`.
- Produce:
  - `LoginFormProps = { onSubmit(values: { rut: string; password: string }): void; isSubmitting?: boolean; formErrorKey?: string; fieldErrorKeys?: { rut?: string; password?: string } }` y `LoginForm(props)`.
  - `LoginPage()` que compone título, subtítulo y `LoginForm` (en esta spec `onSubmit` es una función vacía).
  - Atributos del RUT: `autoComplete="username"`, `inputMode="text"`, `autoCapitalize="off"`; contraseña `autoComplete="current-password"`. Orden de tabulación RUT → contraseña → Mostrar → Continuar.

- [ ] **Paso 1: Pruebas que fallan** (`LoginForm.test.tsx`):
  - reposo: placeholders y botón activo con el texto "Continuar";
  - enviar entrega `{ rut, password }` tal como se escribieron, sin transformarlos;
  - `isSubmitting`: botón deshabilitado con "Ingresando…", campos `readOnly`, y **Enter dentro de un campo no llama a `onSubmit`**;
  - `formErrorKey="login.errors.invalidCredentials"` muestra el texto en un elemento `role="alert"`; con `formErrorKey=""` no hay `role="alert"`; con una llave inexistente renderiza sin lanzar;
  - `fieldErrorKeys.rut` marca solo el RUT con `aria-invalid`.
- [ ] **Paso 2: Prueba de CSS que falla** (`login.css.test.ts`): `login.css` no contiene colores (`#hex`, `rgb(`), ni medidas literales en `px`/`rem` fuera de la media query; todos los valores usan `var(--…)`; la media query usa exactamente `styles.sizes.cardBreakpoint` (480); cada variable `var(--…)` usada existe entre las publicadas por `applyStyleTokens`.
- [ ] **Paso 3: Ejecutar** ambas pruebas. Esperado: FALLAN.
- [ ] **Paso 4: Implementar** `LoginForm` (sin validación ni red; guarda solo los valores de los campos), `LoginPage`, `App`, el arranque en `main.tsx` y `login.css` según "Diseño visual" de la spec: mobile first desde 360 px; por debajo de 480 px sin borde de tarjeta, margen lateral `mobileGutter` y contenido a todo el ancho; desde 480 px tarjeta con borde, radio `card`, `max-width` = `cardMaxWidth`, centrada; campos y botón con alto ≥ `touchTarget`; campos con tamaño de fuente ≥ 16 px en móvil; foco visible con `borderFocus`; `@media (prefers-reduced-motion: reduce)` sin transiciones.
- [ ] **Paso 5: Verificar** pruebas, `typecheck`, `lint`, `format:check`, y `pnpm --filter @financial-risk-manager/frontend run dev` abre el login en `http://localhost:5173`. Esperado: pasa y el login se ve claro.
- [ ] **Paso 6: Commit** — `feat(014): pantalla de login con estados y estilos`

---

### Tarea 6: Vista previa de estados solo para desarrollo

**Archivos:**

- Crear: `frontend/src/resolve-screen.ts`, `frontend/src/pages/LoginStatesPreview.tsx`
- Modificar: `frontend/src/App.tsx`
- Prueba: `frontend/test/resolve-screen.test.ts`, `frontend/test/pages/LoginStatesPreview.test.tsx`

**Interfaces:**

- Produce:
  - `resolveScreen(pathname: string, isDev: boolean): 'login' | 'login-states'` — devuelve `'login-states'` solo si `isDev` y `pathname === '/dev/login-states'`; en cualquier otro caso `'login'`.
  - `LoginStatesPreview()` con los siete estados de la spec, cada uno en una sección con `data-state="<nombre>"` (`idle`, `focus`, `field-error`, `form-error`, `submitting`, `password-visible`, `long-text`) y un título.
- `App` usa `resolveScreen(location.pathname, import.meta.env.DEV)` y carga la vista previa con `import()` dinámico dentro de la rama `import.meta.env.DEV`, para que se elimine del bundle de producción.

- [ ] **Paso 1: Pruebas que fallan** — `resolveScreen('/dev/login-states', true) === 'login-states'`; `resolveScreen('/dev/login-states', false) === 'login'`; `resolveScreen('/', true) === 'login'`; `LoginStatesPreview` renderiza una sección por cada estado listado, con el texto de error de `login.errors.invalidCredentials` en `form-error`.
- [ ] **Paso 2: Ejecutar.** Esperado: FALLAN.
- [ ] **Paso 3: Implementar** según Interfaces; los estados se arman con `LoginForm` y props fijas (el de foco y contraseña visible usan `autoFocus`/estado inicial del componente o una marca de clase de la vista previa, sin lógica en `LoginForm`).
- [ ] **Paso 4: Verificar** pruebas, `typecheck`, `lint`, `format:check`; `vite build` y comprobar que `dist/` no contiene la cadena `login-states` (revisión manual aquí; la automatiza la Tarea 7). Esperado: PASA.
- [ ] **Paso 5: Commit** — `feat(014): vista previa de estados del login para desarrollo`

---

### Tarea 7: Scripts Playwright

**Archivos:**

- Crear: `frontend/playwright.config.ts`, `frontend/e2e/{layout,states,a11y,bundle}.spec.ts`
- Modificar: `frontend/package.json` (dependencia `@playwright/test`, scripts `test:e2e` y `e2e:install`), `frontend/tsconfig.json` (incluir `e2e` y `playwright.config.ts`), `.gitignore` (`playwright-report/`, `test-results/`), `frontend/README.md` (cómo ejecutar y la línea base de capturas)

**Interfaces:**

- Consume: la vista previa en `/dev/login-states` y el login en `/`, servidos por `vite` (config `webServer` con `pnpm run dev` o `vite --port`); `data-state` de la Tarea 6.
- Produce: `pnpm --filter @financial-risk-manager/frontend run test:e2e`; `e2e:install` ejecuta `playwright install chromium` (comando explícito).

- [ ] **Paso 1: Instalar** `@playwright/test` con `pnpm add -D` y ejecutar `e2e:install`. Si la política de supply chain (spec 004) lo impide, **detenerse y consultar al usuario**; no tocar la política. Verificar `pnpm run check:policy`.
- [ ] **Paso 2: Escribir los scripts** (fallan o no según el estado del código; todos deben terminar en verde):
  - `layout.spec.ts`: en 320, 360, 390, 768 y 1280 px `document.documentElement.scrollWidth <= clientWidth` en `/` y en `/dev/login-states`; **pegar 500 caracteres en RUT y contraseña no genera scroll horizontal**; con un viewport de 195 px de ancho (equivale a 390 px con zoom al 200 %) la tarjeta no se corta ni se solapa; por debajo de 480 px la tarjeta no tiene borde y desde 480 px tiene borde y `max-width` de 400 px.
  - `states.spec.ts`: cada `data-state` existe y es visible en 390 y 1280 px; `form-error` expone un `role="alert"`; `submitting` tiene el botón deshabilitado; `password-visible` muestra el texto y el botón "Ocultar"; captura `toHaveScreenshot` de cada estado en ambos anchos (primera ejecución con `--update-snapshots`, revisada a mano).
  - `a11y.spec.ts`: la tabulación recorre RUT → contraseña → Mostrar → Continuar; el campo enfocado tiene borde con color `borderFocus`; campos, botón y "Mostrar" miden ≥ 44 px de alto; el fondo de la página y el de la tarjeta son `background` y `surface` leídos de la configuración; con `emulateMedia({ reducedMotion: 'reduce' })` el `transition-duration` computado de los campos es `0s`.
  - `bundle.spec.ts`: ejecuta `vite build` en un directorio temporal y comprueba que ningún archivo de `dist/` contiene `login-states`.
- [ ] **Paso 3: Ejecutar** `pnpm --filter @financial-risk-manager/frontend run test:e2e`. Esperado: todo pasa; corregir `login.css` o la vista previa si algún caso real revela un defecto (con su prueba Vitest correspondiente si aplica).
- [ ] **Paso 4: Verificar** `typecheck`, `lint`, `format:check`; las capturas quedan versionadas en `e2e/__screenshots__`.
- [ ] **Paso 5: Commit** — `test(014): scripts playwright del diseño del login`

---

### Tarea 8: Converge, documentación y CI

**Archivos:**

- Crear: `docs/implementation/014-login-ui/{tasks,implement}.md`
- Modificar: `docs/specs/014-login-ui.md` (estado final, `status: converged`), `docs/specs/015-login-logica.md` (reconciliar con 014), `docs/specs/README.md` (índice y grafo), `docs/research/014-login-ui/constitution.md`, `frontend/README.md`, `CLAUDE.md` (sección "Frontend (spec 014)": estructura, config de estilos, textos con i18next, scripts), `.github/workflows/ci.yml` solo si hace falta (Vitest ya corre con `pnpm run test`)

- [ ] **Paso 1:** Ejecutar la verificación completa: `pnpm run check:policy`, `pnpm install --frozen-lockfile`, `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm --filter @financial-risk-manager/frontend run build`, `test:e2e`. Esperado: todo verde.
- [ ] **Paso 2:** Completar `tasks.md` (esta lista de tareas con su estado) e `implement.md` (decisiones tomadas, desviaciones, comandos usados).
- [ ] **Paso 3:** Converge: estado final de la spec, revisión de constitution/plan/tasks/implement y de la spec 015, índice y grafo actualizados, `CLAUDE.md` y `frontend/README.md` al día.
- [ ] **Paso 4: Commit** — `docs(014): converge de la spec del login`. El push, los tags y el PR esperan la confirmación del usuario.

---

## Autorrevisión

- **Cobertura de la spec:** diseño y tokens (T2, T5), configuración de estilos y su prueba (T2, T5), estados visuales y props (T5, T6), i18next (T3, T4), accesibilidad RF-4 (T4, T5, T7), vista previa RF-5 (T6), bundle RF-6 (T6, T7), RF-7 (T2, T5), andamiaje y política (T1, T7), pruebas Vitest y Playwright (T1–T7), converge (T8).
- **Consistencia de nombres:** `styles`, `applyStyleTokens`, `toCssVarName`, `initI18n`, `LoginForm`, `resolveScreen`, `data-state` se definen una vez y se reutilizan igual.
- **Supuesto a validar durante la ejecución:** los nombres exactos de las variables CSS (`--<grupo>-<clave>`) son decisión del plan, no de la spec.
