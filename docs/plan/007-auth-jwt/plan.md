# Plan — 007-auth-jwt

Spec: [../../specs/007-auth-jwt.md](../../specs/007-auth-jwt.md)

## Enfoque

Dos servicios con responsabilidades separadas: `token.service` solo conoce criptografía y claims (no accede a datos); `auth.service` es el **validador** que combina la verificación del token con la vigencia del usuario. El middleware y el controlador solo adaptan HTTP.

## Decisiones técnicas

| Decisión                                                                                                                         | Alternativas                | Motivo                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `jose` para firmar y verificar                                                                                                   | `jsonwebtoken`, HMAC manual | Sin dependencias, API moderna; no se implementa criptografía propia                              |
| Algoritmo en `config` (`JWT_ALGORITHM`, solo HS256/HS384/HS512; por defecto HS256)                                               | Algoritmo fijo en el código | Pedido explícito; se verifica solo con el configurado, lo que evita la confusión de algoritmos   |
| Fábricas con dependencias inyectables (`createAuthenticate(deps)`, `createAuthRouter(deps)`) y valores por defecto de producción | Dependencias globales       | Se prueban con un almacén temporal y una configuración propia, sin variables de entorno de datos |
| `JWT_SECRET` de prueba fijo en `vitest.config.ts`                                                                                | Generarla en cada prueba    | `environment` se evalúa al importar; es una clave solo de pruebas                                |
| Una sola clave y un claim `typ`                                                                                                  | Dos claves (access/refresh) | Es lo pedido (una key); `typ` se verifica siempre en ambos sentidos                              |
| Clave por variable de entorno (128 hex)                                                                                          | Generarla en cada arranque  | Generarla al arrancar invalida los tokens al reiniciar y rompe varias instancias                 |
| Script `generate-secret` que solo imprime                                                                                        | Guardarla en un archivo     | La clave no debe quedar en el repositorio ni en disco por defecto                                |
| Vigencia consultada en cada validación                                                                                           | Solo al emitir el token     | Es lo que permite revocar: el token firmado no cambia, el usuario sí                             |
| Rol tomado de `users.json`, no del token                                                                                         | Rol dentro del token        | Un cambio de rol rige de inmediato                                                               |
| Refresh devuelve solo access (sin rotación)                                                                                      | Rotar el refresh            | Lo pedido; rotar exige almacenar `jti`, fuera de alcance                                         |
| `401` genérico con `WWW-Authenticate: Bearer`                                                                                    | Mensajes detallados         | No filtrar si falló firma, expiración o vigencia                                                 |
| `jti` UUID en cada token                                                                                                         | Sin `jti`                   | Costo nulo; habilita revocación por token en el futuro                                           |

## Interfaces

```ts
// token.service.ts
type TokenType = 'access' | 'refresh';
generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string; accessExpiresIn: number; refreshExpiresIn: number }>;
verifyToken(token: string, expected: TokenType): Promise<{ sub: string; jti: string; typ: TokenType }>; // lanza si firma/exp/typ fallan

// auth.service.ts  (validador)
authenticateAccess(token: string): Promise<User>;     // verifyToken(access) + usuario vigente
refreshAccess(token: string): Promise<{ accessToken: string; expiresIn: number }>; // verifyToken(refresh) + usuario vigente
```

Error de dominio `AuthenticationError`; el middleware y el controlador lo traducen a `401`.

## Riesgos

- Revocación sujeta a la recarga de `users.json`: un fallo de lectura/validación hace que se rechace todo (falla cerrado, spec 006).
- Rotar `JWT_SECRET` cierra todas las sesiones.
- Sin emisión de tokens (009) no se puede probar el flujo completo de extremo a extremo con HTTP; se prueba con `generateTokens` directamente.

## Verificación

Pruebas de configuración (secreto, algoritmo, TTL), de servicio y HTTP, escritas antes del código: token válido, expirado, firma alterada, otro algoritmo, `alg: none`, refresh usado como access y access usado como refresh, usuario inexistente, usuario `active: false` (access y refresh). Prueba HTTP del middleware y de `POST /api/auth/refresh`. Verificación manual: pasar `active` a `false` y comprobar rechazo sin reiniciar.
