# Constitution — 017-login-ui

Spec: [../../specs/017-login-ui.md](../../specs/017-login-ui.md)

## Principios y restricciones

- Solo presentación: el formulario no valida, no formatea el RUT y no usa la red; eso es de [018-login-logica](../../specs/018-login-logica.md).
- Mobile first, tema claro estilo Vercel (variante elegida por el usuario), sin sistema de diseño.
- Valores de diseño solo en `frontend/src/config/styles.config.ts`; textos solo en i18next.
- Sin datos en el navegador; el bundle de producción es estático, minificado y sin vista previa.
- TDD, cadena de suministro de la spec 004 intacta (`allowBuilds` vacío, cuarentena de 7 días).

## Contexto investigado

- `frontend/` solo tenía Vitest (spec 010): no hay React, Vite ni entorno DOM, por eso la spec incluye el andamiaje.
- El backend responde errores como `{ "error": "<texto>" }` con status (spec 012); el login real llega con la spec 009. Nada de eso se usa aquí.
- Numeración: 011 (RBAC), 012 (errores) y 013 (score) estaban tomadas por otras ramas; esta spec es 014 y la lógica es 015.
- Maqueta inicial: variante B (oscura) del brainstorming, luego reemplazada por la clara (ver la línea siguiente); los mensajes de error de ejemplo son propuesta del agente.
- El usuario eligió el tema claro el 2026-11-09 (variante A, tras ver el login en ambos temas); `danger` pasó a `#cd2b31` para cumplir AA.

## Preguntas abiertas

- Detalles de cookies (`Secure`, `SameSite`, ruta) cuando exista el login real (015).
- Los supuestos marcados en la spec (fuentes del sistema, vista previa `/dev/login-states`, capturas de referencia) esperan la revisión del usuario.
