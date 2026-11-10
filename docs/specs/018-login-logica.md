---
id: 018-login-logica
title: Lógica del login (validación, llamada a /login, errores por status HTTP)
status: draft # en espera: se retoma cuando el backend publique el login (009)
created: 2026-11-09
updated: 2026-11-09
depends_on: [017-login-ui, 010-tdd-vitest, 012-errores-http]
related: [009-emision-tokens, 013-consulta-score, 008-validador-rut]
supersedes: []
superseded_by: []
---

# 018-login-logica — Lógica del login

> **En espera.** Borrador surgido del brainstorming; se retoma cuando el backend publique el login real ([009-emision-tokens](009-emision-tokens.md)). Se separó de [017-login-ui](017-login-ui.md): **todo lo visual** (diseño, tokens, estados, accesibilidad, textos de la interfaz, andamiaje de Vite/React/i18next y Playwright) vive allí y **prevalece** sobre lo que se repita aquí (RF-1, RF-2, RF-6 en su parte visual y RF-10). Esta spec añade solo la lógica y se reconcilia con 014 antes de planificarse. Los puntos marcados **(supuesto)** son decisiones del agente, no del usuario.

## Resumen

El frontend tendrá dos pantallas: **login** y **consulta de score** ([013-consulta-score](013-consulta-score.md) es el backend de esta última). Esta spec cubre **solo el login**. Quien lo usa es una persona que abre la app en su celular para consultar su score de riesgo financiero, e ingresa con RUT y contraseña.

## Intención y anti-objetivos

- **Meta:** un login simple, claro y confiable en móvil. Si falla, el mensaje dice qué pasó y qué hacer.
- **Anti-objetivos (se considera fracaso aunque "funcione"):** mensajes genéricos o crudos del sistema (`Unauthorized`, `Internal Server Error`); textos escritos a mano dentro de los componentes; guardar datos de sesión en el navegador; un sistema de diseño complejo.

## Alcance

**Incluye:** pantalla de login; validación local de RUT y contraseña con límites configurables; llamada a `POST /login`; mapa de mensajes de error por status HTTP con i18next (solo `es` por ahora); un mock del endpoint; pruebas Vitest y scripts Playwright.
**No incluye:** la pantalla de score (la ruta de destino será un marcador, ver RF-9); restaurar sesión al recargar; cerrar sesión; recuperar contraseña; otros idiomas (solo se deja la infraestructura); el endpoint real de login ([009-emision-tokens](009-emision-tokens.md)).

## Contrato del endpoint (definido por el usuario; lo publicará el backend)

`POST /login`, cuerpo JSON `{ "rut": string, "password": string }`.

- Éxito: `200` con `{ "sub": string, "role": string, "rut": string }`. `role` es la llave del rol del usuario.
- Los tokens **no** viajan en el cuerpo: llegan como **cookies** que fija el backend. El frontend **no guarda nada** en `localStorage`, `sessionStorage` ni memoria persistente, y envía **todas** las peticiones con `credentials: 'include'`.
- Errores: el backend responde `{ "error": "<texto>" }` con un status ([012-errores-http](012-errores-http.md): hoy 400, 401, 403, 404, 500). El frontend **ignora ese texto** y elige el mensaje solo por el status.

## Requisitos

- RF-1: El login tiene dos campos, **RUT** y **contraseña**, y un botón "Continuar". Pantalla mobile first (se diseña desde 390 px de ancho y escala hacia arriba).
- RF-2: Diseño minimalista estilo Vercel, **variante oscura** (elegida por el usuario): fondo `#000`, tarjeta `#0a0a0a` con borde fino `#333`, texto `#ededed`, texto secundario `#a1a1a1`, error `#ff6166`, botón blanco con texto negro, etiquetas de 12 px sobre cada campo. Sin sistema de diseño: CSS plano con variables.
- RF-3: Los **límites de tamaño** de RUT y contraseña (mínimo y máximo de caracteres) viven en **un único archivo de configuración** del frontend, editable sin tocar los componentes.
- RF-4: Validación local antes de enviar: RUT con formato válido y dígito verificador correcto (módulo 11) **(supuesto)**, y ambos campos dentro de sus límites. Un error local muestra su mensaje junto al campo y no hace ninguna petición.
- RF-5: Mientras se escribe, el RUT se formatea (`12.345.678-9`) **(supuesto)**; al enviar, se manda normalizado como `12345678-K` (formato definido por el usuario).
- RF-6: La contraseña tiene un botón "Mostrar/Ocultar". El botón de envío se deshabilita mientras la petición está en curso, para evitar envíos dobles **(supuesto)**.
- RF-7: Todos los textos visibles salen de i18next con un archivo de recursos `es`. Un **mapa llave → mensaje de error por status HTTP** reemplaza a cualquier texto del servidor. Mensajes iniciales (propuesta del agente, a revisar):
  - `400` Revisa los datos ingresados.
  - `401` RUT o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.
  - `403` Tu cuenta no tiene acceso a esta aplicación.
  - `404` No encontramos el servicio. Inténtalo más tarde.
  - `429` Demasiados intentos. Espera unos minutos e inténtalo otra vez.
  - `5xx` Tenemos un problema de nuestro lado. Inténtalo en unos minutos.
  - sin respuesta (red) No pudimos conectar. Revisa tu conexión.
  - cualquier otro status: un mensaje por defecto de su clase (4xx o 5xx). Nunca se muestra texto crudo.
- RF-8: Todas las llamadas al backend usan `fetch` con `credentials: 'include'`. La URL base del API es relativa y configurable (`/api`, con el login en `/api/login`): el frontend se sirve desde el mismo origen que el backend.
- RF-9: Con un `200` correcto, la app navega a la ruta de la pantalla de score. Mientras esa pantalla no exista, la ruta muestra un marcador mínimo **(supuesto)** con el RUT y el rol recibidos.
- RF-10: Accesibilidad básica: etiquetas asociadas a los campos, errores anunciados (`role="alert"`), foco al primer campo con error, objetivos táctiles de al menos 44 px **(supuesto)**.
- RF-11: El mock del endpoint cumple el contrato anterior y solo existe para desarrollo y pruebas; **no entra en el bundle de producción**. El bundle sigue siendo estático, minificado y anonimizado.

## Pruebas

- **Vitest** (`frontend/test/`, espejo de `src/`, nombres `<recurso>.<capa>.test.ts[x]`): validación de RUT y contraseña, formateo del RUT, mapa de errores por status (incluye status no mapeados y falla de red), configuración de límites, cliente de login (verifica `credentials: 'include'` y que no se guarda nada en el navegador), componente del formulario. `fetch` se simula sin librerías adicionales.
- **Playwright** (scripts de validación de extremo a extremo): flujo feliz; cada status del mapa de errores contra el mock; validación local sin petición de red; viewport móvil (390 px) y uno de escritorio; envío doble bloqueado.
- Se trabaja con **TDD** ([010-tdd-vitest](010-tdd-vitest.md)). La implementación se hace con **subagentes** (skill `superpowers:subagent-driven-development`), una tarea por subagente, con revisión entre tareas.

## Restricciones del repo

- pnpm, política de cadena de suministro de [004-pnpm-ci](004-pnpm-ci.md): `allowBuilds` vacío, cuarentena de 7 días, dependencias solo con `pnpm add`. Playwright debe instalar sus navegadores con un comando explícito, no con scripts de ciclo de vida; si la política lo impide, se detiene y se consulta, no se debilita.
- Rama y workspace: `feature/014-frontend-login` en `D:\Persona-ws\014-frontend-login`.
- Commits con scope `015`. El CI debe correr las pruebas Vitest; la integración de Playwright al CI queda fuera de esta spec salvo que el plan lo proponga.

## Decisiones del agente tras la revisión (a validar por el usuario)

- **Límites del RUT:** se miden sobre el RUT **normalizado** (`12345678-K`: sin puntos, con guion, `K` en mayúscula): mínimo 9 y máximo 10 caracteres (7–8 dígitos + guion + dígito verificador). Contraseña: 8–72. Orden: normalizar → medir → validar dígito verificador. Todo en el archivo de configuración.
- **Mock:** plugin de Vite solo en modo desarrollo (`apply: 'serve'`), sin dependencias nuevas. Responde el contrato y fija una cookie `httpOnly` de prueba. Para manual: contraseñas "mágicas" fijas devuelven cada status. En Playwright el status de cada caso se fuerza con `page.route`, así las pruebas no dependen del mock. Una prueba verifica que el bundle de producción no contiene el mock.
- **Destino tras el login:** el marcador recibe RUT y rol por estado del router, en memoria de React. Abrir la ruta directamente, sin ese estado, redirige al login. El marcador no llama a ningún endpoint protegido.
- **Respuesta `200` mal formada** (cuerpo que no es JSON o sin `sub`, `role` o `rut` como strings): se trata como error de servidor y muestra el mensaje de `5xx`.
- **Playwright:** vive en `frontend/e2e/`; los navegadores se instalan con un comando explícito documentado (`playwright install`). Si la política de 004 lo bloquea, el plan lo marca como hito bloqueante y se consulta.
- **Biblioteca de rutas:** la elige el constructor (la más pequeña que cumpla y pase la cuarentena).

## Decisiones del usuario tras la revisión

- **Formato del RUT en `POST /login`:** `12345678-K` (sin puntos, con guion, dígito verificador `K` en mayúscula). El frontend lo normaliza antes de enviarlo; el mock acepta solo ese formato. Todo vive en un único normalizador.
- **Mismo origen:** el frontend se sirve desde el mismo dominio que el backend, para evitar CORS. La URL base del API es relativa (`/api`, login en `/api/login`); en desarrollo, un proxy de Vite hacia el backend. No se configura CORS ni `SameSite=None`; las cookies se envían con `credentials: 'include'` igualmente.

## Por definir

- Detalles de cookies (`Secure`, `SameSite=Lax/Strict`, ruta) cuando el backend publique el login real ([009-emision-tokens](009-emision-tokens.md)).

## Documentos RPI

- Research (constitution): [../research/018-login-logica/constitution.md](../research/014-frontend-login/constitution.md)
- Plan: [../plan/018-login-logica/plan.md](../plan/014-frontend-login/plan.md)
- Tasks: [../implementation/018-login-logica/tasks.md](../implementation/018-login-logica/tasks.md)
- Implement: [../implementation/018-login-logica/implement.md](../implementation/018-login-logica/implement.md)
- Prompt origen: [../prompts/2026-11-09_2103_017-login-ui.md](../prompts/2026-11-09_2103_014-frontend-login.md)

## Specs relacionadas

- depende de: [010-tdd-vitest](010-tdd-vitest.md) — Vitest y TDD; [012-errores-http](012-errores-http.md) — status que el frontend traduce a mensajes.
- relacionada con: [009-emision-tokens](009-emision-tokens.md) — endpoint real de login que reemplazará al mock; [013-consulta-score](013-consulta-score.md) — destino tras el login; [008-validador-rut](008-validador-rut.md) — formato canónico del RUT.

> **Nota (Converge de 014, 2026-11-09):** [017-login-ui](017-login-ui.md) quedó `converged`. Su interfaz usa el **tema claro** (no el oscuro); si esta spec menciona colores o un tema oscuro, prevalece 014. `LoginForm` solo presenta: esta spec le conecta validación, llamada a `/login` y errores por status vía `formErrorKey`/`fieldErrorKeys`, y monta `LoginPage` en `App`.

## Estado final (completar en Converge)

Pendiente.

**Revisión de documentos relacionados:**

- [ ] constitution actualizada
- [ ] plan actualizado
- [ ] tasks actualizadas
- [ ] implement actualizado
- [ ] specs relacionadas revisadas
- [ ] índice `specs/README.md` actualizado
