# Constitution — 016-score-consulta

Spec: [../../specs/016-score-consulta.md](../../specs/016-score-consulta.md)

## Principios y restricciones

- **El backend decide quién ve qué.** El frontend no conoce ni replica permisos ni roles; ni siquiera para ocultar o mostrar controles.
- **Solo el status elige el mensaje.** El texto del cuerpo de una respuesta de error nunca se lee ni se muestra; cada razón de fallo se traduce a una llave `score.errors.*` de i18next.
- **Sin pistas sobre el RUT.** `403` muestra siempre el mismo mensaje y la pantalla no hace peticiones extra para "comprobar" un RUT.
- **Nada sensible en el navegador.** El RUT consultado y el score no se escriben en `localStorage`, `sessionStorage`, la URL ni la consola; el RUT va solo en la ruta de la API.
- **Sin texto visible literal** en componentes (todo por i18next, solo `es`) y **sin colores, radios ni medidas literales** en CSS: solo `var(--...)` y tokens de `styles.config.ts`. Si falta un token, se agrega al config con su prueba.
- **TDD estricto** (spec 010): prueba que falla, código mínimo, refactor. Pruebas en `frontend/test/` espejo de `src/`, imports explícitos de Vitest.
- **Cadena de suministro** (spec 004): sin dependencias nuevas; `allowBuilds` vacío y cuarentena de 7 días intactos.
- Commits `tipo(016): descripción`, sin `--no-verify`; push, tags y PR requieren confirmación del usuario.
- Una respuesta `200` mal formada (no JSON, `rut` vacío, `score` no finito, `fecha` no parseable) se trata como error temporal; el score se muestra tal como llega, sin redondeo ni escala inventada.

## Contexto investigado

- Contrato `GET /api/score/:rut` (ruta singular) de la spec 013 y respuesta confirmada por el usuario `{ rut: "12.345.678-9", score: 73, fecha: "2025-06-27T14:35:00Z" }`; el `rut` de respuesta se muestra tal como llega.
- Orden de decisión del backend: 401, 403, 400, 404.
- El frontend de la spec 014 ya aporta Vite, React 19, Vitest (jsdom), Testing Library, `styles.config.ts` con `applyStyleTokens` (variables `--grupo-clave`), i18n (`initI18n`, `es.json`) y los componentes `Button`, `TextField`, `PasswordField`, `LoginForm` con `login.css`.
- La spec 015 (sesión, validador de RUT del login, cliente de API) y el andamiaje Playwright de la 014 no están integrados: este trabajo implementa un `normalizeRut` propio y un cliente de score autónomo, y difiere la conexión con la sesión y los e2e.
- Fecha: `Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone })`; la zona se inyecta para pruebas con `UTC`.

## Preguntas abiertas

- Renovación de sesión ante `401` (hoy: volver al login).
- Escala o categorías del score (hoy: solo número).
- Distinguir "RUT inexistente" de "sin score" para quien ve todos los scores.
- Reconciliar la spec 013 con `fecha` y el formato con puntos del `rut` de respuesta.
- Ids de spec duplicados con el prefijo `014`.
- Reconciliar `normalizeRut` con el validador de la spec 015 cuando se integre (evitar duplicarlo).
