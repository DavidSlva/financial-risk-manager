# Constitution — 009-emision-tokens

Spec: [../../specs/009-emision-tokens.md](../../specs/009-emision-tokens.md)

## Principios y restricciones

- La contraseña jamás se guarda, registra ni devuelve en claro: solo su hash.
- Contrato estricto y validado **antes** de tocar datos: `rut` (formato canónico, spec 008) y `password` (string de 8 a 128 caracteres).
- El login no debe revelar si un rut existe, si está vigente o si falló la contraseña: respuestas `401` indistinguibles, incluido el tiempo.
- El hash nunca sale de la capa de datos hacia `req.user`, el contexto de autorización o las respuestas.
- Límite de intentos: el contador vive en el modelo de usuario, el máximo en la configuración; el intento se reserva (incrementa) **antes** de verificar para que la concurrencia no eluda el límite; un login exitoso lo reinicia. Un usuario bloqueado recibe el mismo 401.
- La app escribe `users.json` (solo el contador): escritura atómica, serializada y con integridad validada antes de escribir; si falla, se falla cerrado.
- La sesión viaja en cookies `HttpOnly` (frontend y backend bajo el mismo dominio): los tokens nunca están en el cuerpo ni son legibles por JavaScript; `SameSite=Strict`, `Secure` en producción, el refresh solo en la ruta `/api/auth`.
- Sin dependencias nuevas: el hash usa `scrypt` de `node:crypto` (política de cadena de suministro, spec 004).
- La verificación usa comparación en tiempo constante y no bloquea el bucle de eventos.
- Los errores salen del mapa de la spec 012; los servicios no conocen Express.
- TDD (spec 010).

## Contexto investigado

- `scrypt` está en `node:crypto`; OWASP lista `N=2^15, r=8, p=3` entre los parámetros recomendados. Con esos parámetros la memoria ronda 32 MiB por operación, por encima del límite por defecto de Node, así que se fija `maxmem`.
- Un hash con sus parámetros embebidos permite subir el costo sin migrar los datos.
- Spec 007: `generateTokens` ya emite el par; falta quién lo pide y cómo se verifica la identidad.
- Spec 006: `users.json` está fuera de git; ahora guarda hashes y debe seguir así.
- Spec 008: formato canónico del rut y `isValidRut`.

## Preguntas abiertas

- Límites del largo, contrato estricto, fuerza bruta, alta y cambio de contraseña (ver spec).
