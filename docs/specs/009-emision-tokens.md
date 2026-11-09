---
id: 009-emision-tokens
title: Emisión del primer par de tokens (login)
status: draft
created: 2026-11-09
updated: 2026-11-09
depends_on: [007-auth-jwt]
related: []
supersedes: []
superseded_by: []
---

# 009-emision-tokens — Emisión del primer par de tokens

> **Estado: pendiente.** Punto derivado de [007-auth-jwt](007-auth-jwt.md). Aún no se ha especificado.

## Resumen

El usuario solo tiene `rut`, `role` y `active`: no hay credencial con la que verificar su identidad. Esta spec definirá **cómo se obtiene el primer par de tokens**; el servicio que los genera ya existe en la spec 007.

## Por definir

- Mecanismo de verificación de identidad (secreto adicional, proveedor externo, script de administración, otro).
- Si requiere agregar campos al usuario (esto modificaría el modelo de [006-modelo-datos](006-modelo-datos.md)).
- Endpoint de login o alternativa, y sus protecciones (límite de intentos).

## Documentos RPI

Ninguno todavía.

## Specs relacionadas

- depende de: [007-auth-jwt](007-auth-jwt.md) — usa `token.service` para generar el par.

## Estado final (Converge)

Pendiente.
