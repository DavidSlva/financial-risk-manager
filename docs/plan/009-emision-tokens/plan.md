# Plan — 009-emision-tokens

Spec: [../../specs/009-emision-tokens.md](../../specs/009-emision-tokens.md)

## Enfoque

Tres piezas pequeñas y probables por separado: política y hash de contraseñas (`password.service`), caso de uso `login` (`auth.service`) y adaptación HTTP (controlador y ruta) que solo valida el contrato. El resto (tokens, errores, datos) se reutiliza.

## Interfaces

```ts
// config/password-policy.ts
export const PASSWORD_POLICY = { minLength: 8, maxLength: 128 } as const;

// services/password.service.ts
isValidPassword(value: unknown): value is string;                 // largo en puntos de código
hashPassword(password: string, params?: ScryptParams): Promise<string>;   // 'scrypt$N$r$p$sal$hash'
verifyPassword(password: string, hash: string): Promise<boolean>;         // tiempo constante; hash mal formado → false

// models/data.types.ts
interface User { rut; role; active; password_hash }
type AuthenticatedUser = Omit<User, 'password_hash'>;

// services/auth.service.ts
login(rut: string, password: string, deps?: AuthDeps): Promise<TokenPair>;   // 401 genérico si falla
```

## Decisiones técnicas

| Decisión                                                            | Alternativas                      | Motivo                                                                                     |
| ------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `scrypt` de `node:crypto`                                           | `argon2`, `bcrypt` (dependencias) | Sin dependencias nuevas ni scripts de ciclo de vida (spec 004); scrypt es una opción OWASP |
| Parámetros dentro del hash (`scrypt$N$r$p$sal$hash`)                | Parámetros fijos en código        | Permite subir el costo en el futuro sin romper los hashes existentes                       |
| `scrypt` asíncrono                                                  | `scryptSync`                      | No bloquea el bucle de eventos durante ~100 ms                                             |
| Verificar contra un hash señuelo si el usuario no existe/no vigente | Responder de inmediato            | Evita revelar la existencia del rut por diferencia de tiempo                               |
| `timingSafeEqual` para comparar                                     | `===`                             | Comparación en tiempo constante                                                            |
| `AuthenticatedUser` sin `password_hash` en `req.user`               | Pasar `User` completo             | El hash no debe viajar fuera de la capa de datos; el tipo lo impone en compilación         |
| Contrato validado en el controlador, antes de los datos             | Validar dentro del servicio       | 400 sin tocar datos; el servicio recibe tipos ya válidos                                   |
| Contrato estricto (campos extra → 400)                              | Ignorar campos extra              | Superficie de entrada mínima y explícita                                                   |
| Política de largo en `config/password-policy.ts`                    | Constantes en el validador        | Mismo patrón que el mapa de errores y el catálogo de permisos: configuración visible       |
| Hash de ejemplo precalculado en las pruebas, con parámetros bajos   | Calcular el hash en cada prueba   | `N=2^15` hace lentas las pruebas; el formato permite parámetros bajos solo en tests        |
| `hash-password` lee de la entrada estándar                          | Contraseña como argumento         | Los argumentos quedan en el historial del shell                                            |

## Sesión por cookies

```ts
// config/cookies.ts
export const COOKIE_NAMES = { access: 'access_token', refresh: 'refresh_token' } as const;
export function cookieOptions(kind: 'access' | 'refresh', maxAgeSeconds: number, secure: boolean): CookieOptions;
// httpOnly: true, sameSite: 'strict', secure, path: access '/' | refresh '/api/auth', maxAge en ms

// services/cookie.service.ts
parseCookies(header: string | undefined): Record<string, string>;   // puro; primera ocurrencia; ignora lo mal formado
```

| Decisión                                                  | Alternativas                     | Motivo                                                                                        |
| --------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| Tokens solo en `Set-Cookie` `HttpOnly`, no en el cuerpo   | Devolverlos también en el cuerpo | Pedido: el frontend espera cookies; el JavaScript no debe poder leer los tokens               |
| `SameSite=Strict`                                         | `Lax`                            | Mismo dominio: no hace falta enviarlas en navegaciones desde otros sitios; mejor defensa CSRF |
| Refresh con `Path=/api/auth`                              | `Path=/`                         | El refresh viaja solo a las rutas de autenticación                                            |
| `Secure` solo en producción                               | Siempre `Secure`                 | `http://localhost` en desarrollo; en producción solo por HTTPS                                |
| Parseo propio de `Cookie` (función pura)                  | `cookie-parser`                  | Sin dependencias nuevas (spec 004); son pocas líneas                                          |
| `authenticate`: cookie primero, `Bearer` como alternativa | Solo cookie                      | Herramientas y pruebas sin navegador; con ambos presentes vale solo la cookie (determinista)  |
| Refresh sin cuerpo (cookie)                               | Aceptar el refresh en el cuerpo  | Un solo canal; el cuerpo ya no transporta credenciales de sesión                              |
| Sin `Domain` ni prefijo `__Host-`                         | `__Host-`                        | `__Host-` exige `Secure`, que no funciona en `http://localhost` de todos los navegadores      |

## Límite de intentos

```ts
// config/environment.ts: LOGIN_MAX_ATTEMPTS (entero positivo, por defecto 5)  → Environment.loginMaxAttempts

// services/data-store.service.ts
updateUsers<T>(fn: (users: readonly User[]) => { users: readonly User[] | null; result: T }): Promise<T>;
// serializa con una cola; carga y valida; aplica fn; valida el resultado; escribe temp + rename; reinicia la caché

// services/users.service.ts
reserveLoginAttempt(rut: string, max: number, store?): Promise<boolean>; // existe, vigente y contador < max → incrementa → true
resetLoginAttempts(rut: string, store?): Promise<void>;                  // pone 0 (escribe solo si era > 0)

// services/auth.service.ts: login
// 1. reserved = reserveLoginAttempt(rut, max)   2. !reserved → hash señuelo + 401
// 3. verifyPassword → falla → 401   4. éxito → resetLoginAttempts → generateTokens
```

| Decisión                                                 | Alternativas                     | Motivo                                                                                     |
| -------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| Reservar el intento **antes** de verificar               | Incrementar solo tras fallar     | Con peticiones concurrentes, verificar y luego incrementar permite eludir el límite        |
| Cola (mutex) en el almacén para escribir                 | Escribir sin exclusión           | Evita pérdida de actualizaciones del contador dentro del proceso                           |
| Escritura atómica (temporal + renombrado)                | Sobrescribir el archivo          | Una caída a mitad de escritura no deja `users.json` truncado                               |
| Validar la integridad antes de escribir                  | Confiar en el cambio             | Nunca dejar el archivo en un estado que impida arrancar                                    |
| Reiniciar la caché tras escribir                         | Esperar al cambio de `mtime`     | Dos escrituras en el mismo milisegundo darían una caché obsoleta                           |
| Bloqueado ⇒ el mismo 401                                 | 423 / 429 explícito              | No revelar que el rut existe ni que está bloqueado                                         |
| Máximo en `config/environment.ts` (`LOGIN_MAX_ATTEMPTS`) | Constante en el servicio         | Pedido: definido en la configuración, igual que los TTL                                    |
| Desbloqueo manual (operador edita el contador)           | Desbloqueo automático por tiempo | Lo pedido es un contador que solo reinicia un login exitoso; el tiempo es un punto abierto |

## Riesgos

- **Fuerza bruta** sin límite de intentos (punto abierto): mitigación futura con una spec de limitador de tasa.
- Costo de CPU del hash: un atacante puede forzar verificaciones; el máximo de 128 caracteres lo acota, y el limitador futuro lo reduce.
- Ruta de usuario inexistente: el hash señuelo debe tener los mismos parámetros que los reales para igualar el tiempo.

## Verificación (TDD)

`isValidPassword` (límites 7/8/128/129, no string, Unicode); `hashPassword`/`verifyPassword` (ida y vuelta, sal distinta, hash mal formado, parámetros fuera de rango); IR-14; `login` (éxito, rut inexistente, contraseña incorrecta, usuario no vigente, datos corruptos, mismo error en los tres 401); HTTP: matriz completa de 400 del contrato, 401 indistinguibles, 200 con tokens utilizables en `/refresh` y en una ruta protegida, `Cache-Control: no-store`, y que ninguna respuesta ni `req.user` contenga el hash.
