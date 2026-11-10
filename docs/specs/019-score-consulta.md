---
id: 019-score-consulta
title: Pantalla de consulta de score (frontend)
status: implementing
created: 2026-11-09
updated: 2026-11-09
depends_on: [013-consulta-score, 017-login-ui, 018-login-logica]
related: [009-emision-tokens, 011-rbac, 008-validador-rut]
supersedes: []
superseded_by: []
---

# 019-score-consulta — Pantalla de consulta de score

> Borrador para revisión. El **diseño de la pantalla y la forma de la respuesta fueron confirmados por el usuario**. Los puntos marcados **(supuesto)** que quedan son decisiones del agente, no del usuario. Es la segunda y última pantalla de la app; la primera es el login ([017-login-ui](017-login-ui.md), [018-login-logica](018-login-logica.md)).

## Resumen

Una persona ya autenticada consulta el **score de riesgo financiero** de un RUT. El frontend llama a `GET /api/score/:rut` ([013-consulta-score](013-consulta-score.md)) y muestra el resultado. **Quién puede ver qué lo decide solo el backend**: el frontend no conoce ni replica permisos ni roles. Para el usuario hay dos desenlaces: ve el score, o se le informa que no tiene permiso para ver ese RUT.

## Intención y anti-objetivos

- **Meta:** consultar y leer un score en pocos pasos, en móvil, con el mismo estilo oscuro minimalista del login.
- **Anti-objetivos:** que el frontend decida permisos (ni siquiera para ocultar o mostrar controles); mensajes que permitan averiguar si un RUT existe cuando se niega el acceso; mostrar textos crudos del servidor; guardar el RUT consultado o el score en el navegador (ni en `localStorage`, `sessionStorage` ni en la URL).

## Alcance

**Incluye:** pantalla de consulta (campo RUT, botón, resultado); llamada `GET /api/score/:rut` con `credentials: 'include'`; estados de carga, éxito y cada error; mapa de mensajes por status con i18next (`score.*`, solo `es`); manejo de sesión vencida (`401`); pruebas Vitest y scripts Playwright.
**No incluye:** consultas masivas o listados; historial de consultas; interpretación del score (rangos, colores, categorías de riesgo: confirmado por el usuario que no existen; el backend entrega el número y su fecha); cerrar sesión; renovar la sesión automáticamente; recuperar contraseña; otros idiomas.

## Contrato consumido (spec 013 y respuesta confirmada por el usuario)

`GET /api/score/:rut` (la ruta es **singular**), autenticado con la sesión del login (cookies, ver [018-login-logica](018-login-logica.md)).

| Status | Significado                                                                                  | Qué muestra el frontend                              |
| ------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `200`  | `{ "rut": "12.345.678-9", "score": 73, "consulted_at": "2025-06-27T14:35:00Z" }` (ver abajo) | el score, el RUT y la fecha del score                |
| `400`  | `:rut` no es canónico (`12345678-5`)                                                         | mensaje de RUT inválido                              |
| `401`  | sesión ausente, vencida o usuario no vigente                                                 | vuelve al login con aviso de sesión vencida          |
| `403`  | sin permiso para ver ese RUT. Es **idéntico** exista o no el RUT                             | mensaje de falta de permiso, sin pistas sobre el RUT |
| `404`  | el usuario está autorizado y el RUT no tiene score (solo lo ve quien ya está autorizado)     | mensaje de "sin score para este RUT"                 |
| `5xx`  | error del servidor                                                                           | mensaje de problema temporal                         |
| red    | sin respuesta                                                                                | mensaje de falta de conexión                         |

**Respuesta `200` confirmada por el usuario:** `rut` (texto con el formato que entrega el backend, p. ej. `12.345.678-9`), `score` (número) y `consulted_at` (instante ISO 8601 en UTC sin milisegundos). Confirmado por el usuario y alineado con la spec 013 en `develop`: el campo se llama `consulted_at` y el `rut` de la respuesta viene formateado con puntos (`12.345.678-9`). En TypeScript el cliente lo expone como `consultedAt`. El frontend muestra el `rut` de la respuesta **tal como llega**, sin reformatearlo, y no lo usa para ninguna decisión.

El orden de decisión del backend es 401 → 403 → 400 → 404. El frontend nunca interpreta el texto `error` de la respuesta: elige el mensaje solo por el status.

## Diseño visual

Misma identidad que el login ([017-login-ui](017-login-ui.md)): tema oscuro, tokens de `styles.config.ts`, mobile first desde 360 px, objetivos táctiles de 44 px, componentes `TextField` y `Button` reutilizados. Los valores de diseño nuevos que haga falta se agregan al archivo de configuración de estilos, no a los componentes.

**Estructura (de arriba abajo; aprobada por el usuario):** título "Consulta tu score" → subtítulo → campo RUT con su error → botón "Consultar" → tarjeta de resultado.

**Estados de la tarjeta de resultado (aprobados por el usuario):**

1. **Reposo:** sin tarjeta; solo el formulario.
2. **Cargando:** botón deshabilitado con indicador y "Consultando…"; campo de solo lectura.
3. **Éxito:** el score como número grande; debajo, el RUT tal como lo entrega el backend y la fecha del score (ej. "27 de junio de 2025, 10:35" en la hora local del usuario). Sin colores de riesgo, rangos ni categorías.
4. **Sin permiso (`403`):** tarjeta de aviso con "No tienes permiso para ver el score de este RUT."
5. **Sin score (`404`):** "No encontramos un score para este RUT."
6. **RUT inválido (local o `400`):** error de campo bajo el RUT.
7. **Error temporal (`5xx` o sin red):** aviso con el mensaje correspondiente y posibilidad de reintentar con el mismo botón.

Los avisos usan `role="alert"`; el resultado exitoso se anuncia con `role="status"` **(supuesto)**.

## Comportamiento

- RF-1: La pantalla pide un RUT y, al enviar, consulta `GET /api/score/<rut>` con el RUT normalizado a `12345678-5` (sin puntos, `K` en mayúscula) y `encodeURIComponent`. Usa `credentials: 'include'`; no guarda ni lee tokens.
- RF-2: Validación local previa con el mismo validador y normalizador de RUT que usa el login ([018-login-logica](018-login-logica.md)): formato y dígito verificador. Un RUT inválido no hace petición.
- RF-3: El campo RUT parte con **el RUT del usuario autenticado** **(supuesto)**, que se toma del resultado del login y vive solo en memoria. Si no está disponible, parte vacío. Esto no decide permisos: el backend responde igual.
- RF-4: Mensajes por status en un **mapa llave → mensaje** con i18next (`score.errors.forbidden`, `score.errors.notFound`, …), igual que en el login. Un status sin entrada usa el mensaje por defecto de su clase (4xx o 5xx). Nunca se muestra texto del servidor.
- RF-5: `403` muestra el mismo mensaje exista o no el RUT; la pantalla no hace ninguna otra petición para "comprobar" el RUT.
- RF-6: `401` limpia la sesión en memoria y vuelve al login con un aviso de sesión vencida **(supuesto)**. No se reintenta ni se renueva la sesión automáticamente (ver "Por definir").
- RF-7: Una respuesta `200` mal formada (no JSON; `score` que no es número finito; `rut` ausente o que no es texto; `consulted_at` ausente o que no es una fecha ISO válida; una clave antigua `fecha` sin `consulted_at` también es mal formada) se trata como error temporal (`5xx`). `consulted_at` es obligatorio **(supuesto)**. No se interpreta ningún rango del `score`. Se muestra el score tal como lo entrega el backend, sin redondear ni inventar escala.
- RF-8: Mientras hay una consulta en curso, no se envía otra (botón deshabilitado y Enter bloqueado). Si el usuario edita el RUT durante la carga o se cancela la consulta, una respuesta tardía **no** reemplaza lo que se ve ahora (se cancela con `AbortController` y se ignoran respuestas obsoletas).
- RF-9: El RUT consultado y el score nunca se escriben en `localStorage`, `sessionStorage`, la URL ni los registros de consola. El RUT va solo en la ruta de la API.
- RF-10: Accesibilidad: etiqueta asociada al campo, error enlazado con `aria-describedby`/`aria-invalid`, foco al campo con error, orden de tabulación RUT → Consultar.
- RF-11: `consulted_at` se muestra con `Intl.DateTimeFormat` en español de Chile (`es-CL`), fecha larga y hora corta, en la zona horaria local del usuario **(supuesto)**. El formateador recibe la zona como parámetro para que las pruebas usen una fija (`UTC`). El texto de la etiqueta ("Fecha del score") sale de i18next.

## Pruebas

Con **TDD** ([010-tdd-vitest](010-tdd-vitest.md)); `frontend/test/` espeja `src/`.

- **Vitest:**
  - cliente de score: éxito; cada status del contrato (400, 401, 403, 404, 500) y un status sin entrada; falla de red; `200` mal formado (incluida `consulted_at` ausente o inválida y la clave antigua `fecha`); la respuesta de ejemplo `{ rut: "12.345.678-9", score: 73, consulted_at: "2025-06-27T14:35:00Z" }` se interpreta bien; el formateo de la fecha con zona fija; la petición lleva `credentials: 'include'`, el RUT normalizado y codificado y no escribe en el almacenamiento del navegador;
  - mapa de mensajes: cada llave existe en `es.json`; ningún texto del servidor llega a la pantalla;
  - pantalla: cada estado de la tarjeta; el RUT inicial; el envío doble bloqueado; una respuesta tardía no reemplaza la actual; `401` vuelve al login.
- **Playwright** (`frontend/e2e/`, con las respuestas del backend simuladas mediante `page.route`, sin backend real):
  - flujo feliz con score; `403`, `404`, `400`, `401` (vuelve al login), `500` y red caída;
  - en 390 y 1280 px sin scroll horizontal; objetivos táctiles de 44 px; capturas de cada estado como referencia;
  - la URL del navegador nunca contiene el RUT.
- Se ejecuta con subagentes (`superpowers:subagent-driven-development`).

## Restricciones del repo

- Rama y workspace: `feature/019-score-consulta` en `D:\Persona-ws\019-score-consulta`. La implementación necesita el código de [017-login-ui](017-login-ui.md) y de [018-login-logica](018-login-logica.md) integrado en `develop` (o en una rama de integración).
- pnpm y política de cadena de suministro de [004-pnpm-ci](004-pnpm-ci.md): sin dependencias nuevas salvo necesidad probada, solo con `pnpm add`.
- Commits `tipo(016): descripción`, sin saltarse hooks ni CI.

## Por definir

- **Renovación de sesión:** el backend tiene refresh de tokens; esta spec no lo usa y manda al login ante `401`. Decidir si el frontend debe renovar la sesión una vez antes de rendirse.
- **Escala del score:** el contrato entrega un número sin rango. Si se quieren rangos, colores o categorías hace falta que el backend defina la escala.
- **Distinguir "RUT inexistente" de "sin score"** para quienes pueden ver todos los scores (punto abierto de la spec 013).
- ~~Reconciliar la spec 013 con la respuesta real~~ **Resuelto:** el usuario confirmó `consulted_at` y el `rut` de respuesta con puntos (`12.345.678-9`).
- **Número de spec:** hay otra rama con el prefijo `014` (`feature/014-cors-desarrollo`); los ids de spec deberían ser únicos antes de integrar.

## Documentos RPI

- Research (constitution): [../research/019-score-consulta/constitution.md](../research/019-score-consulta/constitution.md)
- Plan: [../plan/019-score-consulta/plan.md](../plan/019-score-consulta/plan.md)
- Tasks: [../implementation/019-score-consulta/tasks.md](../implementation/019-score-consulta/tasks.md)
- Implement: [../implementation/019-score-consulta/implement.md](../implementation/019-score-consulta/implement.md)
- Prompt origen: [../prompts/2026-11-09_2138_019-score-consulta.md](../prompts/2026-11-09_2138_019-score-consulta.md)

## Specs relacionadas

- depende de: [013-consulta-score](013-consulta-score.md) — contrato del endpoint y tabla de decisión.
- depende de: [017-login-ui](017-login-ui.md) — diseño, componentes, tokens e i18next que se reutilizan.
- depende de: [018-login-logica](018-login-logica.md) — sesión por cookies, cliente de API, validador de RUT y mapa de errores por status.
- relacionada con: [009-emision-tokens](009-emision-tokens.md), [011-rbac](011-rbac.md) — sesión y permisos del lado del backend.
- relacionada con: [008-validador-rut](008-validador-rut.md) — formato canónico del RUT.

## Estado final (completar en Converge)

**Parcial (2026-11-09).** Implementado el núcleo del frontend: normalización de RUT, cliente de score, mapa de errores sin texto del servidor, formato de fecha, textos `score.*`, `ScoreResult`, `ScorePage` y estilos (commits `f5d7188`, `cc92e21`). Verificado: format, lint, typecheck, test (frontend 18 archivos y 135 pruebas; backend 27 archivos y 516), check:policy y build del frontend.

**Integración (rama `integration/login-score`, 2026-11-09):** `ScorePage` quedó montado en `App` con `initialRut` = RUT de la sesión y `onSessionExpired` (vuelve al login con el aviso `login.notices.sessionExpired`); `ScorePlaceholder` eliminado. Corregido: el cliente de score ignoraba `VITE_API_BASE_URL` (llamaba a `/api/score` relativo; ahora usa `apiUrl`), una excepción no-abort del cliente se trata como fallo de red, un `401` sin `onSessionExpired` muestra `score.errors.sessionExpired`, y el campo RUT recibe el foco con error local o `400` (RF-10). `normalizeRut` se unificó con el de 018 (recorta espacios). Probado de inicio a fin contra el backend real: login por cookies, score propio, otro RUT (admin), `403`, `404`, `400` local y `401` por sesión expirada.

**Diferido:** Playwright e2e del flujo contra el backend; la reconciliación con la 013 quedó resuelta (`consulted_at`).

**Hallazgos de la revisión final (aprobada):** 1 importante (`ScorePage` sin montar en `App`, la spec no puede cerrarse sin la integración) y 7 menores (errores no-abort en `ScorePage`, foco en el campo con error RF-10, `AbortError` en `parseSuccess`, `hourCycle` no documentado, `normalizeRut` sin trim, `line-height: 1` literal, y un punto sin hallazgos). Detalle en [implement.md](../implementation/019-score-consulta/implement.md).

**Revisión de documentos relacionados:**

- [x] constitution actualizada
- [x] plan actualizado
- [x] tasks actualizadas
- [x] implement actualizado
- [ ] specs relacionadas revisadas
- [x] índice `specs/README.md` actualizado
