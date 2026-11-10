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

## Riesgos

- **Fuerza bruta** sin límite de intentos (punto abierto): mitigación futura con una spec de limitador de tasa.
- Costo de CPU del hash: un atacante puede forzar verificaciones; el máximo de 128 caracteres lo acota, y el limitador futuro lo reduce.
- Ruta de usuario inexistente: el hash señuelo debe tener los mismos parámetros que los reales para igualar el tiempo.

## Verificación (TDD)

`isValidPassword` (límites 7/8/128/129, no string, Unicode); `hashPassword`/`verifyPassword` (ida y vuelta, sal distinta, hash mal formado, parámetros fuera de rango); IR-14; `login` (éxito, rut inexistente, contraseña incorrecta, usuario no vigente, datos corruptos, mismo error en los tres 401); HTTP: matriz completa de 400 del contrato, 401 indistinguibles, 200 con tokens utilizables en `/refresh` y en una ruta protegida, `Cache-Control: no-store`, y que ninguna respuesta ni `req.user` contenga el hash.
