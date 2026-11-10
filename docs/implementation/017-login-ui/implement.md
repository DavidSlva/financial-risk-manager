# Implement — 017-login-ui

Spec: [../../specs/017-login-ui.md](../../specs/017-login-ui.md) · Tasks: [tasks.md](tasks.md)

## Registro

Las horas salen de `git log` (hora local, -0300) y de `date`; no son estimaciones.

| Fecha            | Tarea | Resultado | Notas                                                                                                                           |
| ---------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-09 21:21 | Docs  | OK        | Spec, plan y constitution (`7339b2c`).                                                                                          |
| 2026-11-09 21:24 | T1    | OK        | Andamiaje (`d535e7e`). Dependencias con `pnpm add` bajo la cuarentena; `pnpm-workspace.yaml` sin cambios.                       |
| 2026-11-09 21:27 | T2    | OK        | Configuración de estilos y `applyStyleTokens` (`3428fde`). T2 y T3 se hicieron en paralelo (archivos disjuntos).                |
| 2026-11-09 21:27 | T3    | OK        | i18next y `es.json` (`0fabe8d`).                                                                                                |
| 2026-11-09 21:30 | T4    | OK        | `Button`, `TextField`, `PasswordField` (`3adbdc4`).                                                                             |
| 2026-11-09 21:33 | T5    | Ajuste    | `LoginForm`, `LoginPage` y estilos (`7d0d979`). La revisión halló Mostrar/Ocultar bajo el campo (la maqueta lo muestra dentro). |
| 2026-11-09 21:40 | T5    | Ajuste    | Corrección 1 (`2624069`): Mostrar/Ocultar dentro del campo, prueba de CSS estricta, prueba del envío directo; 5 tokens más.     |
| 2026-11-09 21:42 | T5    | OK        | Corrección 2 (`0d41e1f`): token `passwordToggleWidth` (72 px) y aserciones de valores de tokens. Revisión limpia.               |
| 2026-11-09 21:46 | T6    | OK        | Vista previa `/dev/login-states` solo en DEV (`e827904`).                                                                       |
| 2026-11-09 21:54 | T7    | OK        | Scripts Playwright (`5709518`), puerto 5299.                                                                                    |
| 2026-11-09 22:01 | T7b   | OK        | Tema claro (`f73cbff`); `danger` de `#e5484d` a `#cd2b31`; 44 pruebas Playwright estables.                                      |
| 2026-11-09 22:06 | T8    | OK        | Verificación completa y Converge (ver abajo).                                                                                   |

## Verificación final (2026-11-09 22:06)

`check:policy` OK; `pnpm install --frozen-lockfile` OK; `format:check`, `lint` y `typecheck` sin errores; `pnpm run test`: backend 164 pruebas (14 archivos) y frontend 71 pruebas (13 archivos); `build` del frontend OK (53 módulos); `test:e2e`: 44 pruebas pasan (Chromium, puerto 5299).

## Decisiones tomadas

- **Tema claro.** El usuario eligió la variante clara tras ver ambos temas; la oscura se descartó. Spec, plan y constitution se ajustaron.
- **`danger` `#cd2b31`** (antes `#e5484d`): el anterior daba 3.7:1 sobre `#fafafa`; el nuevo da 5.05:1 sobre `#fafafa` y 5.27:1 sobre `#ffffff` (AA). Prueba `styles.contrast.test.ts`.
- **Mostrar/Ocultar dentro del campo**, a la derecha, mediante `endAdornment` (como en la maqueta aprobada).
- **Tokens agregados** a `styles.config.ts` por necesidad de la implementación: `focusRingWidth`, `spinnerSize`, `spinnerBorderWidth`, `spinnerDuration`, `spinnerTurn` y `passwordToggleWidth`.
- **Cadena de suministro:** dependencias solo con `pnpm add` bajo la cuarentena de 7 días; el navegador de Playwright se instala con `e2e:install` (comando explícito, sin scripts de ciclo de vida); `allowBuilds` sigue vacío.
- **Puertos:** Playwright usa 5299 (levanta y detiene su propio Vite); 3000 y 5180 quedan para desarrollo.
- **CI:** no corre Playwright (solo Vitest, que ya corre con `pnpm run test`); `ci.yml` sin cambios.
- **Bundle:** la vista previa se excluye del bundle de producción (probado en `bundle.spec.ts`).

## Menores diferidos

- Contraste del botón deshabilitado ~2.4:1 (depende de `textDisabled`).
- El spinner queda detenido con `prefers-reduced-motion`.
- Fuente de los campos a 14 px desde 480 px (en móvil es 16 px).
- Ancho del toggle (72 px) atado a las etiquetas en español.
- `snapshotPathTemplate` sin `{platform}`: las líneas base son de Chromium en Windows.
- Sin tolerancia explícita en las capturas.
- `showPassword` de la vista previa no es seguro bajo StrictMode (hoy no se usa).
- El toggle usa `aria-pressed` con nombre cambiante (WAI-ARIA sugiere uno solo); `aria-describedby` pone la ayuda antes del error; el error de campo no usa `role="alert"` (el de formulario sí).
- El verificador de texto literal no cubre `{'texto'}`.
- `setup.test.ts` solo verifica el entorno DOM; `apply-tokens.test.ts` usa un cast `as never`; pruebas de unidades solo por muestras.
- `FORBIDDEN` del bundle usa etiquetas legibles; la prueba de orden de tabulación asume que el primer Tab cae en `#rut`.
- Sin prueba unitaria de la guarda DEV de `App` (la cubre Playwright).
