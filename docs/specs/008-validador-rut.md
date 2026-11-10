---
id: 008-validador-rut
title: Validador del formato de RUT (formato canónico 12345678-5)
status: converged
created: 2026-11-09
updated: 2026-11-09
depends_on: [006-modelo-datos, 010-tdd-vitest]
related: [009-emision-tokens, 013-consulta-score]
supersedes: []
superseded_by: []
---

# 008-validador-rut — Validador del formato de RUT

## Resumen

El RUT se **guarda internamente** en un único formato canónico, `12345678-5`, y el **frontend debe enviarlo exactamente así**. Este spec define ese formato y un validador puro y reutilizable. No hay normalización: el backend no corrige lo que recibe; si no está en formato canónico, es inválido.

## Alcance

**Incluye:** formato canónico, validación del dígito verificador (módulo 11), validador `isValidRut`, nueva regla de integridad para los datos, aplicación en el contrato de login ([009](009-emision-tokens.md)) y en el parámetro de `GET /api/score/:rut` ([013](013-consulta-score.md)).
**No incluye:** normalización o limpieza de entradas (puntos, espacios, `k` minúscula), formatear el RUT para mostrarlo, RUT de empresas con reglas distintas.

## Formato canónico

`NNNNNNN-D` o `NNNNNNNN-D`:

- **Cuerpo:** 7 u 8 dígitos, sin ceros a la izquierda (de 1.000.000 a 99.999.999).
- **Guion** `-` separando cuerpo y dígito verificador.
- **Dígito verificador (DV):** un dígito `0`–`9` o la letra `K` **en mayúscula**.
- **Sin** puntos, **sin** espacios, **sin** minúsculas.

Expresión: `^[1-9]\d{6,7}-[\dK]$`, más la comprobación del DV.

### Dígito verificador (módulo 11)

1. Multiplicar los dígitos del cuerpo, de derecha a izquierda, por la serie `2, 3, 4, 5, 6, 7` (se repite desde 2).
2. Sumar los productos.
3. `r = 11 − (suma mod 11)`. Si `r = 11` → DV `0`; si `r = 10` → DV `K`; en otro caso, DV = `r`.

### Casos de referencia

| Entrada           | Válido | Motivo                          |
| ----------------- | ------ | ------------------------------- |
| `12345678-5`      | sí     | Ejemplo canónico                |
| `1000005-K`       | sí     | DV `K`; cuerpo de 7 dígitos     |
| `1000030-0`       | sí     | DV `0`                          |
| `11111111-1`      | sí     |                                 |
| `12345678-4`      | no     | DV incorrecto                   |
| `12.345.678-5`    | no     | Con puntos                      |
| `123456785`       | no     | Sin guion                       |
| `1000005-k`       | no     | `k` minúscula                   |
| ` 12345678-5`     | no     | Espacio inicial (no se recorta) |
| `012345678-5`     | no     | Cero a la izquierda             |
| `123456-5`        | no     | Cuerpo de 6 dígitos             |
| `123456789-5`     | no     | Cuerpo de 9 dígitos             |
| `""`, `null`, `5` | no     | No es un string no vacío        |

## Requisitos

- RF-1: `rut.service.ts` exporta `isValidRut(value: unknown): value is string`: `true` solo para un string en formato canónico con DV correcto.
- RF-2: Función pura, sin acceso a datos ni a Express. No modifica, recorta ni convierte la entrada.
- RF-3: **Integridad de datos (IR-13):** `users.rut` y `scores.rut` deben ser RUT válidos. Se suma a IR-1…IR-12 y se valida al arrancar y en recarga, como el resto.
- RF-4: **Contrato de login:** el `rut` del cuerpo de `POST /api/auth/login` se valida con `isValidRut`; si no es válido, `400 BAD_REQUEST` ([009](009-emision-tokens.md)).
- RF-5: **Parámetro de score:** el controlador de `GET /api/score/:rut` valida `:rut` con `isValidRut` y responde `400` si no es válido. Se valida **después** de `authenticate` y `authorize`, de modo que un usuario sin permiso sigue recibiendo `403` sin importar el formato.
- RF-6: Con esto la comparación textual del rut propio en `canGetScore` ([013](013-consulta-score.md)) es consistente: un solo formato válido.

## Diseño

```
backend/src/
├── services/rut.service.ts               # isValidRut
├── services/data-integrity.service.ts    # + IR-13 (users.rut, scores.rut)
└── controllers/scores.controller.ts      # valida :rut → 400
```

## Documentos RPI

- Research (constitution): [../research/008-validador-rut/constitution.md](../research/008-validador-rut/constitution.md)
- Plan: [../plan/008-validador-rut/plan.md](../plan/008-validador-rut/plan.md)
- Tasks: [../implementation/008-validador-rut/tasks.md](../implementation/008-validador-rut/tasks.md)
- Implement: [../implementation/008-validador-rut/implement.md](../implementation/008-validador-rut/implement.md)
- Prompt origen: [../prompts/2026-11-09_2101_008-009-contrato-login.md](../prompts/2026-11-09_2101_008-009-contrato-login.md)

## Specs relacionadas

- depende de: [006-modelo-datos](006-modelo-datos.md) — origen del requisito y reglas de integridad que se amplían.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — se implementa con TDD.
- relacionada con: [009-emision-tokens](009-emision-tokens.md) — el contrato de login usa este validador.
- relacionada con: [013-consulta-score](013-consulta-score.md) — valida `:rut`; cierra su punto abierto sobre la comparación textual.

## Puntos abiertos

- **Rango del cuerpo (7–8 dígitos):** se excluyen RUT menores a 1.000.000 y mayores a 99.999.999. Confirmar si hay casos fuera de rango.
- **Datos actuales:** los RUT de ejemplo (`11111111-1`, `22222222-2`, …, `99999999-9`) son válidos con esta regla.
- **Aplicar a `:rut` de score (RF-5):** es un ajuste a la spec 013 que no se había pedido explícitamente; confirmar.

## Estado final (Converge)

Implementado con TDD en `feature/008-validador-rut` (workspace `D:\Persona-ws\008-validador-rut`): las pruebas se escribieron primero y se confirmó que fallaban (11 pruebas en rojo y 1 archivo sin compilar) antes de implementar. Resultado: 332 pruebas en verde (59 nuevas), `eslint`, `tsc` y `prettier --check` sin errores.

Verificado con el servidor compilado: con datos válidos arranca; con un `scores.json` cuyo rut tiene un dígito verificador incorrecto (`11111111-2`) no arranca, sale con código 1 e informa IR-8 e IR-13.

Implementado:

- `rut.service.ts`: `isValidRut(value: unknown)`, función pura (formato `^[1-9]\d{6,7}-[\dK]---
  id: 008-validador-rut
  title: Validador del formato de RUT (formato canónico 12345678-5)
  status: converged
  created: 2026-11-09
  updated: 2026-11-09
  depends_on: [006-modelo-datos, 010-tdd-vitest]
  related: [009-emision-tokens, 013-consulta-score]
  supersedes: []
  superseded_by: []

---

# 008-validador-rut — Validador del formato de RUT

## Resumen

El RUT se **guarda internamente** en un único formato canónico, `12345678-5`, y el **frontend debe enviarlo exactamente así**. Este spec define ese formato y un validador puro y reutilizable. No hay normalización: el backend no corrige lo que recibe; si no está en formato canónico, es inválido.

## Alcance

**Incluye:** formato canónico, validación del dígito verificador (módulo 11), validador `isValidRut`, nueva regla de integridad para los datos, aplicación en el contrato de login ([009](009-emision-tokens.md)) y en el parámetro de `GET /api/score/:rut` ([013](013-consulta-score.md)).
**No incluye:** normalización o limpieza de entradas (puntos, espacios, `k` minúscula), formatear el RUT para mostrarlo, RUT de empresas con reglas distintas.

## Formato canónico

`NNNNNNN-D` o `NNNNNNNN-D`:

- **Cuerpo:** 7 u 8 dígitos, sin ceros a la izquierda (de 1.000.000 a 99.999.999).
- **Guion** `-` separando cuerpo y dígito verificador.
- **Dígito verificador (DV):** un dígito `0`–`9` o la letra `K` **en mayúscula**.
- **Sin** puntos, **sin** espacios, **sin** minúsculas.

Expresión: `^[1-9]\d{6,7}-[\dK]$`, más la comprobación del DV.

### Dígito verificador (módulo 11)

1. Multiplicar los dígitos del cuerpo, de derecha a izquierda, por la serie `2, 3, 4, 5, 6, 7` (se repite desde 2).
2. Sumar los productos.
3. `r = 11 − (suma mod 11)`. Si `r = 11` → DV `0`; si `r = 10` → DV `K`; en otro caso, DV = `r`.

### Casos de referencia

| Entrada           | Válido | Motivo                          |
| ----------------- | ------ | ------------------------------- |
| `12345678-5`      | sí     | Ejemplo canónico                |
| `1000005-K`       | sí     | DV `K`; cuerpo de 7 dígitos     |
| `1000030-0`       | sí     | DV `0`                          |
| `11111111-1`      | sí     |                                 |
| `12345678-4`      | no     | DV incorrecto                   |
| `12.345.678-5`    | no     | Con puntos                      |
| `123456785`       | no     | Sin guion                       |
| `1000005-k`       | no     | `k` minúscula                   |
| ` 12345678-5`     | no     | Espacio inicial (no se recorta) |
| `012345678-5`     | no     | Cero a la izquierda             |
| `123456-5`        | no     | Cuerpo de 6 dígitos             |
| `123456789-5`     | no     | Cuerpo de 9 dígitos             |
| `""`, `null`, `5` | no     | No es un string no vacío        |

## Requisitos

- RF-1: `rut.service.ts` exporta `isValidRut(value: unknown): value is string`: `true` solo para un string en formato canónico con DV correcto.
- RF-2: Función pura, sin acceso a datos ni a Express. No modifica, recorta ni convierte la entrada.
- RF-3: **Integridad de datos (IR-13):** `users.rut` y `scores.rut` deben ser RUT válidos. Se suma a IR-1…IR-12 y se valida al arrancar y en recarga, como el resto.
- RF-4: **Contrato de login:** el `rut` del cuerpo de `POST /api/auth/login` se valida con `isValidRut`; si no es válido, `400 BAD_REQUEST` ([009](009-emision-tokens.md)).
- RF-5: **Parámetro de score:** el controlador de `GET /api/score/:rut` valida `:rut` con `isValidRut` y responde `400` si no es válido. Se valida **después** de `authenticate` y `authorize`, de modo que un usuario sin permiso sigue recibiendo `403` sin importar el formato.
- RF-6: Con esto la comparación textual del rut propio en `canGetScore` ([013](013-consulta-score.md)) es consistente: un solo formato válido.

## Diseño

```
backend/src/
├── services/rut.service.ts               # isValidRut
├── services/data-integrity.service.ts    # + IR-13 (users.rut, scores.rut)
└── controllers/scores.controller.ts      # valida :rut → 400
```

## Documentos RPI

- Research (constitution): [../research/008-validador-rut/constitution.md](../research/008-validador-rut/constitution.md)
- Plan: [../plan/008-validador-rut/plan.md](../plan/008-validador-rut/plan.md)
- Tasks: [../implementation/008-validador-rut/tasks.md](../implementation/008-validador-rut/tasks.md)
- Implement: [../implementation/008-validador-rut/implement.md](../implementation/008-validador-rut/implement.md)
- Prompt origen: [../prompts/2026-11-09_2101_008-009-contrato-login.md](../prompts/2026-11-09_2101_008-009-contrato-login.md)

## Specs relacionadas

- depende de: [006-modelo-datos](006-modelo-datos.md) — origen del requisito y reglas de integridad que se amplían.
- depende de: [010-tdd-vitest](010-tdd-vitest.md) — se implementa con TDD.
- relacionada con: [009-emision-tokens](009-emision-tokens.md) — el contrato de login usa este validador.
- relacionada con: [013-consulta-score](013-consulta-score.md) — valida `:rut`; cierra su punto abierto sobre la comparación textual.

## Puntos abiertos

- **Rango del cuerpo (7–8 dígitos):** se excluyen RUT menores a 1.000.000 y mayores a 99.999.999. Confirmar si hay casos fuera de rango.
- **Datos actuales:** los RUT de ejemplo (`11111111-1`, `22222222-2`, …, `99999999-9`) son válidos con esta regla.
- **Aplicar a `:rut` de score (RF-5):** es un ajuste a la spec 013 que no se había pedido explícitamente; confirmar.

y dígito verificador por módulo 11). Cubre toda la tabla de casos de la spec, incluidos DV `0` y `K`, entradas que no son string y variantes no canónicas (puntos, `k` minúscula, espacios, ceros a la izquierda, dígitos de ancho completo).

- IR-13 en `data-integrity.service`: `users.rut` y `scores.rut`, solo para filas que ya pasaron IR-2 e IR-3 (sin violaciones duplicadas).
- `scores.controller`: valida `:rut` con `isValidRut` y responde 400, **después** de `authenticate` y `authorize`. Orden comprobado por HTTP: 401 → 403 → 400 → 404.

Notas:

- Los RUT de ejemplo del repositorio son válidos con la regla; no hubo que migrar datos ni fixtures.
- Se cierra el punto abierto de la spec [013](013-consulta-score.md): con un único formato válido, la comparación textual del rut propio es coherente.
- La rama integra antes la 013 (ruta `/api/score/:rut`).
- Cierre a las 21:10.

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [x] specs relacionadas revisadas (006 y 013 con nota de evolución; 009 usará `isValidRut`)
- [x] índice `specs/README.md` actualizado
