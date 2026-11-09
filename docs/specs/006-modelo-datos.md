---
id: 006-modelo-datos
title: Modelo de datos base (users.json, scores.json) e integridad referencial
status: tasked
created: 2026-11-09
updated: 2026-11-09
depends_on: [005-backend-estructura]
related: [007-auth-jwt]
supersedes: []
superseded_by: []
---

# 006-modelo-datos — Modelo de datos base

## Resumen

La app devuelve un **score financiero asociado a un rut**. No hay base de datos: los datos viven en `users.json` y `scores.json`. Esta spec define su modelo con mentalidad SQL (claves primaria y foránea, restricciones) y valida la **integridad referencial** al cargar. El modelo es mínimo a propósito.

## Alcance

**Incluye:** esquema de ambos archivos, reglas de integridad, validación al arranque y en recarga, servicios de lectura, datos de ejemplo.
**No incluye:** escritura de datos (los archivos se editan a mano), validación del formato del RUT ([008-validador-rut](008-validador-rut.md), pendiente), endpoints HTTP del score, autenticación ([007-auth-jwt](007-auth-jwt.md)).

## Modelo

Referencia en SQL (equivalente lógico; no hay motor SQL):

```sql
CREATE TABLE users (
  rut    TEXT PRIMARY KEY,
  role   TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  active BOOLEAN NOT NULL            -- marca de vigencia
);

CREATE TABLE scores (
  rut   TEXT PRIMARY KEY REFERENCES users (rut) ON DELETE RESTRICT,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1000)
);
```

Relación: `users 1 — 0..1 scores`. Un usuario puede no tener score aún; un score no puede existir sin usuario.

Archivos en `backend/data/` (ruta configurable con `DATA_DIR`):

`users.json`

```json
[
  { "rut": "11111111-1", "role": "admin", "active": true },
  { "rut": "22222222-2", "role": "user", "active": false }
]
```

`scores.json`

```json
[{ "rut": "11111111-1", "score": 780 }]
```

El usuario tiene **solo** `rut`, `role` y `active` (la vigencia, que usa [007-auth-jwt](007-auth-jwt.md) para revocar).

## Reglas de integridad

| Id   | Regla                                                                             | Equivalente SQL    |
| ---- | --------------------------------------------------------------------------------- | ------------------ |
| IR-1 | Cada archivo es un arreglo JSON de objetos                                        | tabla              |
| IR-2 | Cada fila tiene exactamente sus columnas, con el tipo correcto (sin campos extra) | esquema            |
| IR-3 | `users.rut` y `scores.rut`: string no vacío, sin espacios en los extremos         | NOT NULL           |
| IR-4 | `users.rut` único                                                                 | PRIMARY KEY        |
| IR-5 | `scores.rut` único (un score por rut)                                             | PRIMARY KEY        |
| IR-6 | `scores.rut` debe existir en `users.rut`                                          | FOREIGN KEY        |
| IR-7 | `users.role` ∈ {`admin`, `user`}                                                  | CHECK              |
| IR-8 | `users.active` es booleano                                                        | NOT NULL / BOOLEAN |
| IR-9 | `scores.score` es entero entre 0 y 1000                                           | CHECK              |

El formato del RUT (dígito verificador, normalización) no se valida aquí: lo cubre [008-validador-rut](008-validador-rut.md). Hasta entonces el rut es un identificador opaco (IR-3).

## Comportamiento

- **Arranque:** se leen y validan ambos archivos. Si alguna regla falla, el proceso aborta e informa **todas** las violaciones (archivo, fila, regla).
- **Recarga:** los archivos se vuelven a leer cuando cambia su fecha de modificación, para que un cambio de vigencia (`active`) rija sin reiniciar. Si el contenido nuevo no valida, se **falla cerrado**: se informa el error y se rechazan las operaciones que dependan de los datos, en lugar de usar datos inconsistentes.
- **Datos reales fuera del repositorio:** `backend/data/*.json` se ignora en git. Se versionan `users.example.json` y `scores.example.json` con datos ficticios.

## Documentos RPI

- Research (constitution): [../research/006-modelo-datos/constitution.md](../research/006-modelo-datos/constitution.md)
- Plan: [../plan/006-modelo-datos/plan.md](../plan/006-modelo-datos/plan.md)
- Tasks: [../implementation/006-modelo-datos/tasks.md](../implementation/006-modelo-datos/tasks.md)
- Implement: pendiente
- Prompt origen: [../prompts/2026-11-09_2002_006-007-modelo-datos-y-auth.md](../prompts/2026-11-09_2002_006-007-modelo-datos-y-auth.md)

## Specs relacionadas

- depende de: [005-backend-estructura](005-backend-estructura.md) — ubicación en capas (`services/`, `config/`).
- relacionada con: [007-auth-jwt](007-auth-jwt.md) — consume la vigencia del usuario.
- deriva en: [008-validador-rut](008-validador-rut.md) — validación del formato de RUT (pendiente).

## Puntos abiertos

- Valores de `role`: se asumen `admin` y `user`. Confirmar.
- Rango del score: se asume 0–1000. Confirmar.
- Formato canónico del rut (con/sin puntos y guion) → 008.
- `DATA_DIR` por defecto: `data/` relativo al directorio del backend.

## Estado final (Converge)

Pendiente: la spec está en etapa `tasked`; falta implementar y hacer converge.
