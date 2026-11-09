---
id: 011-rbac
title: RBAC simple (permisos clave-valor por rol)
status: draft
created: 2026-11-09
updated: 2026-11-09
depends_on: [006-modelo-datos, 007-auth-jwt]
related: []
supersedes: []
superseded_by: []
---

# 011-rbac — RBAC simple

> **Estado: pendiente.** Punto derivado de [006-modelo-datos](006-modelo-datos.md). Aún no se ha especificado en detalle.

## Resumen

Control de acceso por rol. Dentro del mismo modelo de datos, cada rol (`roles`) se relaciona de **0 a n** con **permisos**, que indican los **endpoints** a los que ese rol tiene acceso. El modelo `permission` es simple: **clave–valor**. El **middleware** valida el permiso en cada petición, después de autenticar ([007-auth-jwt](007-auth-jwt.md)).

## Por definir

- Estructura de `permissions` (archivo, columnas, clave foránea a `roles.name`) y qué representan la clave y el valor.
- Cómo se identifica un endpoint (método + ruta, patrones).
- Middleware de autorización: dónde se registra, respuesta ante falta de permiso (`403`).
- Nuevas reglas de integridad para el modelo (se suman a las de la spec 006).

## Documentos RPI

Ninguno todavía.

## Specs relacionadas

- depende de: [006-modelo-datos](006-modelo-datos.md) — tabla `roles` sobre la que se agregan los permisos.
- depende de: [007-auth-jwt](007-auth-jwt.md) — el usuario autenticado y su rol vigente.

## Estado final (Converge)

Pendiente.
