---
id: 008-validador-rut
title: Validador del formato de RUT
status: draft
created: 2026-11-09
updated: 2026-11-09
depends_on: [006-modelo-datos]
related: []
supersedes: []
superseded_by: []
---

# 008-validador-rut — Validador del formato de RUT

> **Estado: pendiente.** Punto derivado de [006-modelo-datos](006-modelo-datos.md). Aún no se ha especificado en detalle.

## Resumen

Validar el formato del RUT chileno y normalizarlo a un formato canónico, para usarlo en la carga de datos y, más adelante, en las entradas de la API.

## Por definir

- Formato canónico de almacenamiento (ej. `12345678-5`, sin puntos, `K` en mayúscula).
- Validación del dígito verificador (módulo 11) y rangos aceptados.
- Dónde se aplica: carga de `users.json`/`scores.json` (nueva regla de integridad), parámetros de la API.
- Ubicación en el código (`services/rut.service.ts` o utilitario) según la convención de [005-backend-estructura](005-backend-estructura.md).

## Documentos RPI

Ninguno todavía.

## Specs relacionadas

- depende de: [006-modelo-datos](006-modelo-datos.md) — origen del requisito; agregará una regla al modelo.

## Estado final (Converge)

Pendiente.
