---
id: 014-login-ui
title: Diseño de la pantalla de login (mobile first, tema oscuro, sin lógica de negocio)
status: planned
created: 2026-11-09
updated: 2026-11-09
depends_on: [010-tdd-vitest]
related: [015-login-logica, 013-consulta-score]
supersedes: []
superseded_by: []
---

# 014-login-ui — Diseño de la pantalla de login

> Borrador para revisión. Los puntos marcados **(supuesto)** son decisiones del agente, no del usuario. La lógica (validación, llamada a `/login`, errores por status) queda **fuera** y se especifica en [015-login-logica](015-login-logica.md) cuando el backend esté listo.

## Resumen

Construir **solo la pantalla de login**, como interfaz: cómo se ve, cómo se comporta visualmente en cada estado y cómo responde a distintos anchos de pantalla. El formulario no sabe nada del backend: recibe por props lo que debe mostrar y avisa con callbacks lo que la persona hizo. Así el diseño se revisa y se prueba de forma aislada, y la lógica se conecta después sin rehacer la interfaz.

Quien la usa abre la app en su celular para consultar su score de riesgo financiero; lo primero que ve es este login.

## Intención y anti-objetivos

- **Meta:** un login minimalista, claro y confiable en móvil, con estilo Vercel en su **variante oscura** (elegida por el usuario).
- **Anti-objetivos:** un sistema de diseño o librería de componentes (la configuración de estilos solo trae los valores que la spec usa); colores, radios o tamaños escritos a mano fuera del archivo de configuración; textos escritos a mano en los componentes; que el diseño dependa del backend para verse o probarse; guardar cualquier dato en el navegador.

## Alcance

**Incluye:** andamiaje mínimo del frontend (Vite + React + TypeScript, ver "Andamiaje"); pantalla y componentes del login; tema oscuro con valores de diseño en un archivo de configuración de estilos que se publica como variables CSS; todos los estados visuales; textos en i18next (solo `es`); accesibilidad básica; vista previa de estados para desarrollo; pruebas Vitest y scripts Playwright **del diseño**.
**No incluye:** validación de RUT o contraseña y su archivo de límites; llamada de red; mapa de errores por status HTTP; navegación tras el login; mock del endpoint; otros idiomas (solo queda lista la infraestructura). Todo eso va en [015-login-logica](015-login-logica.md).

## Diseño visual

Referencia aprobada: variante B (oscura) de la maqueta de brainstorming.

**Fuente única de los valores de diseño:** el archivo de configuración de estilos `frontend/src/config/styles.config.ts` (ver "Configuración de estilos"). Los valores de abajo son los iniciales; cambiarlos es editar ese archivo, sin tocar componentes ni CSS.

**Colores:**

| Clave (`colors.*`) | Valor     | Uso                                |
| ------------------ | --------- | ---------------------------------- |
| `background`       | `#000000` | fondo de la página                 |
| `surface`          | `#0a0a0a` | tarjeta                            |
| `border`           | `#333333` | bordes de tarjeta y campos         |
| `borderFocus`      | `#ededed` | borde del campo con foco           |
| `text`             | `#ededed` | texto principal                    |
| `textMuted`        | `#a1a1a1` | subtítulo y acciones secundarias   |
| `textDisabled`     | `#6b6b6b` | placeholder y estado deshabilitado |
| `danger`           | `#ff6166` | borde y texto de error             |
| `buttonBackground` | `#ededed` | botón principal                    |
| `buttonText`       | `#000000` | texto del botón principal          |

**Radios (`radius.*`):** `field` 6 px (campos y botón), `card` 12 px (tarjeta).

**Tipografía (`typography.*`, supuesto):** pila de fuentes del sistema (`system-ui, -apple-system, "Segoe UI", sans-serif`); sin descargar fuentes externas. Título 22 px / 600 con `letter-spacing: -0.02em`; subtítulo 13 px; etiquetas 12 px / 500; campos y botón 14 px; mensajes de error 12 px. En los campos de texto el tamaño en móvil es **al menos 16 px** para que iOS no haga zoom al enfocar **(supuesto)**.

**Tamaños y espaciado (`sizes.*`, `spacing.*`, supuesto):** `touchTarget` 44 px, `cardMaxWidth` 400 px, `mobileGutter` 24 px, `cardBreakpoint` 480 px, escala de espaciado de 4 px (`spacing.1` = 4 px, `spacing.2` = 8 px, …) y `borderWidth` 1 px.

**Movimiento (`motion.*`, supuesto):** `transitionDuration` 150 ms; se anula con `prefers-reduced-motion`.

## Configuración de estilos

Solo las especificaciones generales que esta spec usa; no es un sistema de diseño completo y crece solo cuando una spec lo necesita.

- **Archivo:** `frontend/src/config/styles.config.ts`, un objeto tipado y de solo lectura con los grupos `colors`, `radius`, `typography`, `sizes`, `spacing` y `motion` de arriba. Es el único lugar con valores literales de color, radio, tamaño o fuente.
- **Aplicación:** al arrancar, `applyStyleTokens()` escribe cada valor como variable CSS en `:root` (`colors.textMuted` → `--color-text-muted`, `radius.field` → `--radius-field`, …). Las hojas de estilo (`styles/login.css`) solo consumen `var(--…)`; no contienen colores ni medidas literales.
- **Excepción conocida:** las media queries no pueden leer variables CSS, así que `cardBreakpoint` (480 px) también aparece en `login.css`. Una prueba verifica que ambos valores coincidan **(supuesto)**.
- **Cambios:** modificar un valor en el archivo cambia toda la interfaz; una prueba recorre la configuración y comprueba que cada clave se publica como variable y que `login.css` no usa valores literales.

**Estructura (de arriba abajo):** título "Iniciar sesión" → subtítulo "Ingresa tu RUT y contraseña para ver tu score." → campo RUT (etiqueta + campo + ayuda/error) → campo Contraseña (etiqueta + campo con acción "Mostrar/Ocultar" + error) → mensaje de error del formulario (si hay) → botón "Continuar".

**Mobile first:**

- Se diseña desde **360 px** de ancho y escala hacia arriba; sin scroll horizontal en ningún ancho.
- Por debajo de 480 px **(supuesto)**: sin borde de tarjeta, contenido a todo el ancho con 24 px de margen lateral, centrado verticalmente en alturas grandes y alineado arriba cuando el teclado reduce la altura.
- Desde 480 px **(supuesto)**: tarjeta con borde fino, `max-width: 400px`, centrada en la pantalla.
- Objetivos táctiles (campos, botón, "Mostrar") de **al menos 44 px** de alto.
- Se respeta `prefers-reduced-motion` (sin transiciones si está activo) y el tema es solo oscuro (sin selector de tema).

## Componentes

Carpeta `frontend/src/` con la convención de [005-backend-estructura](005-backend-estructura.md) adaptada al frontend **(supuesto)**:

```
frontend/src/
├── main.tsx
├── App.tsx                      # por ahora solo monta LoginPage
├── pages/LoginPage.tsx          # composición de la pantalla
├── components/
│   ├── LoginForm.tsx            # formulario y sus estados
│   ├── TextField.tsx            # etiqueta + campo + mensaje
│   ├── PasswordField.tsx        # TextField con Mostrar/Ocultar
│   └── Button.tsx               # botón principal con estado de carga
├── config/styles.config.ts      # valores de diseño (colores, radios, tipografía, tamaños)
├── i18n/{index.ts, es.json}     # i18next y recursos en español
└── styles/{apply-tokens.ts, login.css}  # applyStyleTokens y estilos que solo usan var(--…)
```

**Contrato de `LoginForm` (solo presentación):**

- Props: `onSubmit({ rut, password })`, `isSubmitting?: boolean`, `formErrorKey?: string` (llave i18next del mensaje de error del formulario), `fieldErrorKeys?: { rut?: string; password?: string }`.
- No valida, no formatea el RUT, no llama a la red y no guarda estado fuera de los valores de los campos. Al enviar, entrega los valores tal como se escribieron.
- Todo texto visible se obtiene con `t(llave)`; los componentes no contienen textos literales.

## Estados visuales a cubrir

1. **Reposo:** campos vacíos con placeholder (`12345678-K` y vacío), botón activo.
2. **Foco:** borde `--border-focus` visible y claro (también con teclado).
3. **Error de campo:** borde `--danger` y mensaje bajo el campo.
4. **Error de formulario:** mensaje en `--danger` sobre el botón, anunciado con `role="alert"`.
5. **Enviando:** botón deshabilitado con indicador de carga y texto "Ingresando…"; campos de solo lectura.
6. **Contraseña visible:** el campo muestra el texto y la acción cambia a "Ocultar".
7. **Texto largo / zoom del navegador al 200 %:** nada se corta ni se solapa.

## Requisitos

- RF-1: La pantalla se ve y funciona según "Diseño visual" en anchos de 360, 390, 768 y 1280 px.
- RF-2: Cubre los siete estados anteriores, controlados solo por props (más el estado local de Mostrar/Ocultar).
- RF-3: Todo texto sale de i18next con recursos `es`; las llaves tienen una convención estable (`login.title`, `login.rut.label`, `login.errors.invalidCredentials`, …) para que [015-login-logica](015-login-logica.md) agregue sus mensajes sin tocar componentes.
- RF-4: Accesibilidad: cada campo con `<label>` asociado; `autocomplete="username"` y `autocomplete="current-password"` (para gestores de contraseñas); `inputMode` y `autocapitalize="off"` adecuados al RUT **(supuesto)**; errores de campo enlazados con `aria-describedby` y `aria-invalid`; el mensaje de error del formulario con `role="alert"`; el orden de tabulación es RUT → contraseña → Mostrar → Continuar; contraste AA como mínimo.
- RF-5: Una **vista previa de estados** solo para desarrollo (`/dev/login-states`, excluida del bundle de producción) muestra los siete estados en una sola página para revisión visual **(supuesto)**.
- RF-6: El bundle de producción es estático, minificado y con nombres hasheados ([001-setup-inicial](001-setup-inicial.md)); no incluye vista previa ni datos de prueba.
- RF-7: Los valores de diseño (colores, radios, tipografía, tamaños, espaciado, movimiento) viven solo en `config/styles.config.ts` y se publican como variables CSS con `applyStyleTokens()`; los componentes y `login.css` no contienen valores literales de esas categorías (ver "Configuración de estilos").

## Andamiaje del frontend (mínimo, supuesto)

Hoy `frontend/` solo tiene Vitest. Esta spec agrega lo indispensable: Vite, React y React DOM, `@vitejs/plugin-react`, i18next y react-i18next, un entorno de DOM para Vitest y una herramienta de pruebas de componentes, Playwright. Reglas:

- Solo con `pnpm add`, bajo la política de [004-pnpm-ci](004-pnpm-ci.md) (`allowBuilds` vacío, cuarentena de 7 días). Si una versión está bloqueada se espera o se elige otra; no se debilita la política.
- Playwright instala sus navegadores con un comando explícito y documentado, no con scripts de ciclo de vida. Si la política lo impide, el plan lo marca como hito bloqueante y se consulta.
- Scripts nuevos en `frontend/package.json`: `dev`, `build`, `preview`, `test:e2e`. El CI sigue corriendo Vitest; Playwright en CI queda fuera salvo que el plan lo proponga.

## Pruebas

Con **TDD** ([010-tdd-vitest](010-tdd-vitest.md)): `frontend/test/` espeja `src/` (`<recurso>.<capa>.test.tsx`); imports con `../src/...`.

- **Vitest:**
  - `LoginForm`: cada estado por props; el envío entrega los valores; el botón deshabilitado no envía; Mostrar/Ocultar alterna el tipo del campo; los errores se asocian con `aria-describedby`/`aria-invalid` y `role="alert"`.
  - Textos: todas las llaves usadas existen en `es.json`; ningún componente contiene texto literal visible.
  - Estilos: `applyStyleTokens()` publica cada clave de la configuración como variable CSS con el nombre y valor esperados; `login.css` no contiene colores, radios ni medidas literales (solo `var(--…)`), salvo el breakpoint, que debe coincidir con `sizes.cardBreakpoint`; cambiar un valor en la configuración cambia la variable publicada.
- **Playwright** (`frontend/e2e/`, contra la vista previa de estados y el login servido por Vite, sin backend):
  - los siete estados en 390 px y 1280 px; sin scroll horizontal en 360, 390, 768 y 1280 px;
  - el orden de tabulación y el foco visible;
  - objetivos táctiles de al menos `sizes.touchTarget` (44 px); la tarjeta respeta `sizes.cardMaxWidth` y el borde y fondo de la página usan los colores de la configuración;
  - capturas de pantalla de cada estado como referencia visual (la línea base se revisa a mano la primera vez) **(supuesto)**;
  - el bundle de producción no contiene la vista previa.
- La implementación se ejecuta con **subagentes**: `superpowers:writing-plans` para el plan y `superpowers:subagent-driven-development` para ejecutarlo, una tarea por subagente con revisión entre tareas.

## Restricciones del repo

- Rama y workspace: `feature/014-login-ui` en `D:\Persona-ws\014-login-ui`.
- Commits con scope `014`: `tipo(014): descripción`. Hooks y CI sin saltarse.

## Documentos RPI

- Research (constitution): [../research/014-login-ui/constitution.md](../research/014-login-ui/constitution.md)
- Plan: [../plan/014-login-ui/plan.md](../plan/014-login-ui/plan.md)
- Tasks: [../implementation/014-login-ui/tasks.md](../implementation/014-login-ui/tasks.md)
- Implement: [../implementation/014-login-ui/implement.md](../implementation/014-login-ui/implement.md)
- Prompt origen: [../prompts/2026-11-09_2103_014-login-ui.md](../prompts/2026-11-09_2103_014-login-ui.md)

## Specs relacionadas

- depende de: [010-tdd-vitest](010-tdd-vitest.md) — Vitest y TDD.
- relacionada con: [015-login-logica](015-login-logica.md) — conecta este formulario con validación, `/login` y errores; [013-consulta-score](013-consulta-score.md) — pantalla a la que se llega tras el login.

## Estado final (completar en Converge)

Pendiente.

**Revisión de documentos relacionados:**

- [ ] constitution actualizada
- [ ] plan actualizado
- [ ] tasks actualizadas
- [ ] implement actualizado
- [ ] specs relacionadas revisadas
- [ ] índice `specs/README.md` actualizado
