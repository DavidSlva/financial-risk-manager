# Constitution — 014-cors-desarrollo

Spec: [../../specs/014-cors-desarrollo.md](../../specs/014-cors-desarrollo.md)

## Principios y restricciones

- En producción, frontend y backend comparten dominio: CORS desactivado por defecto.
- En desarrollo (front `localhost:3000`, back `localhost:8000`) CORS funciona **por defecto**, sin configurar nada.
- La sesión viaja en cookies: CORS con credenciales, así que **nunca** `Access-Control-Allow-Origin: *` y nunca se refleja un origen sin validar.
- Lista de orígenes explícita y validada al arrancar; coincidencia exacta.
- Sin dependencias nuevas (política de cadena de suministro, spec 004): son pocas cabeceras.
- TDD (spec 010).

## Contexto investigado

- `localhost:3000` y `localhost:8000` son el mismo **sitio** (el puerto no cuenta) pero **orígenes** distintos: las cookies `SameSite=Strict` se envían, y el navegador igualmente exige CORS.
- Con `credentials: 'include'` el navegador rechaza `*` en `Allow-Origin` y exige `Allow-Credentials: true`.
- `127.0.0.1` y `localhost` son sitios distintos: con `SameSite=Strict` las cookies no viajarían entre ellos.
- Un `Content-Type: application/json` en un `POST` desencadena preflight; el middleware debe responderlo antes de `express.json()` y de las rutas.

## Preguntas abiertas

- Cabeceras y métodos a medida que crezca la API; frontend en otro dominio en producción (ver spec).
