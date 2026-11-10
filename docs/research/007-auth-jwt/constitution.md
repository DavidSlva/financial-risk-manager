# Constitution — 007-auth-jwt

Spec: [../../specs/007-auth-jwt.md](../../specs/007-auth-jwt.md)

## Principios y restricciones

- JWT simétrico; la clave son 64 bytes aleatorios de `crypto`; el algoritmo (simétrico) se define en `config/environment.ts`.
- El access autentica; el refresh no autentica y solo emite un access nuevo.
- Los tokens deben poder revocarse: la vigencia del usuario (`active`) se consulta en cada validación.
- La clave y los TTL se configuran en `config/environment.ts`, único lugar que lee `process.env`.
- No se implementa criptografía propia; solo se acepta el algoritmo configurado.
- Rechazos genéricos: sin detalle que ayude a un atacante.
- Toda dependencia nueva entra por `pnpm add` bajo la cuarentena de 7 días (spec 004).
- La emisión del primer par de tokens queda fuera de alcance (decisión del usuario).

## Contexto investigado

- Spec 006: el usuario tiene `rut`, `role`, `active`; los datos se recargan por fecha de modificación y fallan cerrado.
- Spec 005: servicios sin Express; controladores sin negocio; nombres `<recurso>.<capa>.ts`.
- Un JWT HS256 con clave de 64 bytes supera el mínimo recomendado (32 bytes) para HMAC-SHA256.
- Riesgos conocidos de JWT: aceptar `alg: none` o confundir algoritmos; aceptar un refresh como access (confusión de tipo).

## Preguntas abiertas

Ver "Puntos abiertos" en la spec (biblioteca, ejecutor de pruebas, rotación de clave, revocación por `jti`, emisión).
