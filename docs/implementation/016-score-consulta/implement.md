# Implement — 016-score-consulta

Spec: [../../specs/016-score-consulta.md](../../specs/016-score-consulta.md) · Tasks: [tasks.md](tasks.md)

## Registro

| Fecha            | Tarea  | Resultado | Notas                                                                                                      |
| ---------------- | ------ | --------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-11-09 21:49 | docs   | hecho     | Plan y constitution (`a8f80e6`)                                                                            |
| 2026-11-09 21:51 | T1     | hecho     | Núcleo: RUT, fecha, errores y cliente (`f5d7188`)                                                          |
| 2026-11-09 21:55 | T2, T3 | hecho     | Textos, `ScoreResult`, `ScorePage` y estilos (`cc92e21`)                                                   |
| 2026-11-09 21:57 | docs   | parcial   | Converge parcial; verificaciones: format, lint, typecheck, test (frontend 135, backend 516), policy, build |
| 2026-11-09 22:07 | T6     | hecho     | `fecha` pasa a `consulted_at` (TS `consultedAt`); la clave antigua es mal formada                          |

## Diferido

- Playwright e2e (T5).
- Integración con la sesión: montar `ScorePage` en `App`, `onSessionExpired` real (401 hacia login) e `initialRut`, tras la spec 015 (T4). Hoy la pantalla no es alcanzable desde `App`.

## Hallazgos de la revisión final (veredicto: aprobado)

| Severidad | Archivo                                     | Hallazgo y arreglo propuesto                                                                                                                                                                                                                             |
| --------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| important | `frontend/src/App.tsx`                      | `ScorePage` no está montada; los requisitos de sesión, rutas y E2E quedan diferidos. Arreglo: tarea de integración y E2E tras 015, luego Converge.                                                                                                       |
| minor     | `frontend/src/pages/ScorePage.tsx:68-83`    | Un error no-abort se relanza en un handler async: rechazo no manejado, carga fija e `inFlightRef` bloqueado; un 401 sin `onSessionExpired` no muestra nada. Arreglo: tratar como `network`/`server-error`, restablecer estado y mostrar sesión expirada. |
| minor     | `frontend/src/pages/ScorePage.tsx:55-66`    | RF-10: nadie mueve el foco al campo con error. Arreglo: ref o prop de foco en `TextField` y prueba con `document.activeElement`.                                                                                                                         |
| minor     | `frontend/src/api/score.client.ts:15-23`    | `parseSuccess` convierte un `AbortError` durante `response.json()` en `malformed`. Arreglo: re-lanzar el aborto y probarlo.                                                                                                                              |
| minor     | `frontend/src/lib/format-score-date.ts:2-7` | `hourCycle: 'h23'` no está en la interfaz fija (estabiliza "14:35"). Arreglo: documentarlo en el plan; opcional, exigir ISO 8601 y score 0-100.                                                                                                          |
| minor     | `frontend/src/lib/rut.ts:1-6`               | `normalizeRut` no hace trim. Arreglo: trim y reutilizar el normalizador de 015 al integrar (evitar dos normalizadores).                                                                                                                                  |
| minor     | `frontend/src/styles/score.css:25`          | `line-height: 1` literal. Arreglo: token en `styles.config.ts` si se exigen cero literales.                                                                                                                                                              |
| minor     | `frontend/src/api/score.client.ts`          | Riesgos de usuario verificados sin hallazgos (doble envío, respuesta tardía, sin console ni almacenamiento, RUT solo en la ruta, sin texto del servidor).                                                                                                |
