# Implement — 008-validador-rut

Spec: [../../specs/008-validador-rut.md](../../specs/008-validador-rut.md) · Tasks: [tasks.md](tasks.md)

## Registro

| Fecha            | Tarea | Resultado | Notas                                                                                                                                                            |
| ---------------- | ----- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-09 21:02 | —     | OK        | Workspace `D:\Persona-ws\008-validador-rut` desde `feature/013-consulta-score`; spec, plan y tasks                                                               |
| 2026-11-09 21:09 | —     | OK        | Integrada la rama 013 (ruta `/api/score/:rut`)                                                                                                                   |
| 2026-11-09       | T1–T5 | OK        | Rojo: 11 pruebas fallaban y 1 archivo no compilaba. Verde: 332 pruebas (un error de tipos en una tabla de la prueba, corregido con `it.each<[unknown, string]>`) |
| 2026-11-09 21:10 | T6–T7 | OK        | `eslint`, `tsc`, `prettier` sin errores; servidor real aborta con un rut inválido en `scores.json`                                                               |
