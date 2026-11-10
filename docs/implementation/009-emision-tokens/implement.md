# Implement — 009-emision-tokens

Spec: [../../specs/009-emision-tokens.md](../../specs/009-emision-tokens.md) · Tasks: [tasks.md](tasks.md)

## Registro

| Fecha            | Tarea    | Resultado | Notas                                                                                                                                                         |
| ---------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-09 21:04 | —        | OK        | Workspace `D:\Persona-ws\009-emision-tokens` desde `feature/008-validador-rut`; spec, plan y tasks                                                            |
| 2026-11-09 21:11 | —        | OK        | Integrada la rama 008; la spec incorpora el contador de intentos (`failed_attempts`, `LOGIN_MAX_ATTEMPTS`)                                                    |
| 2026-11-09       | T1, T4b  | OK        | Rojo: 7 pruebas y 1 archivo sin compilar. Verde: 388. Un error mío al escribir la expresión regular del hash (escapes) lo detectó lint y 4 pruebas; corregido |
| 2026-11-09       | T3, T4   | OK        | Fixtures migrados al modelo nuevo (92 pruebas en rojo hasta implementar), IR-14/IR-15 y `AuthenticatedUser`: 407 en verde                                     |
| 2026-11-09       | T4c, T4d | OK        | Rojo: 25 pruebas. Verde: 432 (`updateUsers` y reserva/reinicio de intentos)                                                                                   |
| 2026-11-09       | T5       | OK        | Rojo: 25 pruebas. Verde: 457 (`login` y señuelo de tiempo)                                                                                                    |
| 2026-11-09       | T6, T7   | OK        | Rojo: 35 pruebas. Verde: 499 (contrato HTTP, 401 indistinguibles, bloqueo, extremo a extremo)                                                                 |
| 2026-11-09       | T8       | Ajuste    | Rojo: 15 pruebas. Verde: 516; 5 fallaron en la corrida completa por el timeout de 5 s con scrypt de costo real: timeout global de 30 s                        |
| 2026-11-09 21:25 | T9–T10   | OK        | `eslint`, `tsc`, `prettier`; 3 corridas completas en verde; servidor real: 400, 3 × 401, bloqueo con contraseña correcta, desbloqueo                          |
