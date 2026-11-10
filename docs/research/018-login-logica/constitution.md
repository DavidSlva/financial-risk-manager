# Constitution — 018-login-logica

Spec: [../../specs/018-login-logica.md](../../specs/018-login-logica.md)

## Principios y restricciones

- Contrato real: el frontend consume `POST /api/auth/login` de [009-emision-tokens](../../specs/009-emision-tokens.md) tal como existe (cuerpo con exactamente `rut` canónico y `password`, `Content-Type: application/json`, `credentials: 'include'`). No hay mock.
- Sesión por cookies `HttpOnly`: el frontend nunca ve ni guarda tokens. La sesión del frontend es solo `{ rut, expiresAt }` en memoria de React.
- Nada sensible en el navegador: contraseña, RUT y tokens jamás van a `localStorage`, `sessionStorage`, la URL ni la consola; los errores de red no se registran con sus datos.
- El mensaje de error se elige solo por el status HTTP; el texto del campo `error` del servidor nunca se muestra ni se usa.
- Validación local previa: un error local no hace petición y enfoca el primer campo inválido. Límites en un único archivo (`config/login-limits.ts`); la contraseña no se recorta ni se normaliza y se cuenta en puntos de código Unicode.
- Sin envíos dobles (Enter ni submit directo); `AbortController` al desmontar.
- Cambios mínimos a componentes de 014 (props opcionales, retrocompatibles); sin texto visible literal ni valores de diseño literales; sin dependencias nuevas (spec 004 intacta).
- TDD estricto y commits `tipo(015): descripción`, sin `--no-verify`; sin push ni PR sin confirmación.

## Contexto investigado

- 014 dejó `LoginForm` presentacional (estados por props), `TextField`/`PasswordField`, `LoginPage` sin lógica, `App` con `resolveScreen` y la vista previa `/dev/login-states` (solo dev).
- El backend (009, con cookies) responde `200 { expiresIn, refreshExpiresIn }`, `400`, `401` idéntico para RUT inexistente, clave incorrecta, usuario no vigente o bloqueado, `5xx`. No existen `logout` ni un endpoint de "quién soy": recargar vuelve al login.
- CORS con credenciales para desarrollo ([014-cors-desarrollo](../../specs/014-cors-desarrollo.md)): origen `http://localhost:3000`, API en `http://localhost:8000/api`; hay que usar `localhost` (con `127.0.0.1` `SameSite=Strict` no enviaría las cookies).
- `normalizeRut` también lo necesita 019-score-consulta: ambas ramas definen `frontend/src/lib/rut.ts` con la misma firma.

## Preguntas abiertas

- Cierre de sesión y renovación (`/api/auth/refresh`) quedan fuera hasta que existan en el backend.
- Recuperar la sesión al recargar requiere un endpoint (p. ej. `/api/auth/me`).
- Los textos de `401`, `429` y los demás son supuestos del agente, pendientes de revisión del usuario.
- Playwright e2e y prueba manual contra el backend real quedan diferidos (Tarea 3).
- Numeración duplicada `014-cors-desarrollo` / `017-login-ui`.
