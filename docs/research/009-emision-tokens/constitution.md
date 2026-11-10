# Constitution — 009-emision-tokens

Spec: [../../specs/009-emision-tokens.md](../../specs/009-emision-tokens.md)

## Principios y restricciones

- La contraseña jamás se guarda, registra ni devuelve en claro: solo su hash.
- Contrato estricto y validado **antes** de tocar datos: `rut` (formato canónico, spec 008) y `password` (string de 8 a 128 caracteres).
- El login no debe revelar si un rut existe, si está vigente o si falló la contraseña: respuestas `401` indistinguibles, incluido el tiempo.
- El hash nunca sale de la capa de datos hacia `req.user`, el contexto de autorización o las respuestas.
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
