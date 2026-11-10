# Plan — 011-rbac

Spec: [../../specs/011-rbac.md](../../specs/011-rbac.md)

## Enfoque

Ampliar el modelo de datos con `permissions` (validado como el resto), exponer `hasPermission` y construir un middleware genérico `authorize(check)` que no sabe nada de recursos: solo ejecuta el callback que cada recurso aporta desde su service.

## Interfaces

```ts
// config/permissions.ts
export const PERMISSIONS = { CAN_GET_SCORE: 'can_get_score', CAN_GET_ALL_SCORE: 'can_get_all_score' } as const;
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export function isPermissionKey(value: unknown): value is PermissionKey;

// models/authorization.types.ts
export interface AuthorizationContext { user: Readonly<User>; params: Readonly<Record<string, string>>; query: Readonly<Record<string, unknown>> }
export type AuthorizationCheck = (context: AuthorizationContext) => boolean | Promise<boolean>;

// services/permissions.service.ts
hasPermission(role: string, key: PermissionKey, store?: DataStore): boolean;
requirePermission(key: PermissionKey, store?: DataStore): AuthorizationCheck;   // para recursos triviales

// middlewares/authorize.middleware.ts
authorize(check: AuthorizationCheck): RequestHandler;
```

## Decisiones técnicas

| Decisión                                              | Alternativas                            | Motivo                                                                              |
| ----------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| Callback por recurso definido en su service           | Tabla endpoint→permiso en el middleware | Pedido explícito: la regla es personalizada (p. ej. "su propio rut vs. cualquiera") |
| Contexto plano `{ user, params, query }`              | Pasar `Request`                         | Los services no conocen Express (spec 005)                                          |
| Catálogo cerrado en `config/permissions.ts`           | Claves libres en el archivo             | El callback conoce todas las claves; IR-12 detecta claves mal escritas              |
| `value` booleano; solo `true` concede                 | Presencia de la fila = concedido        | Permite una negación explícita y deja el modelo clave–valor                         |
| `permissions.json` versionado                         | Ignorarlo con los datos personales      | No contiene datos personales; define la política de acceso                          |
| `authorize` exige el callback (sin valor por defecto) | Callback permisivo por defecto          | Denegar por defecto: un olvido no debe abrir un recurso                             |
| `requirePermission(key)` para recursos triviales      | Repetir la lógica en cada service       | Un solo lugar para el caso "solo exige este permiso"                                |
| Sin `req.user` → `UNAUTHORIZED` (no `FORBIDDEN`)      | Dejar pasar o 403                       | Es un error de configuración de la ruta; se falla cerrado                           |

## Riesgos

- Orden de middlewares: `authorize` sin `authenticate` antes; se trata como `UNAUTHORIZED`, y las pruebas lo cubren.
- Un permiso mal escrito en `permissions.json` impediría arrancar (IR-12): es el comportamiento buscado.

## Verificación (TDD)

Pruebas de las reglas IR-10…IR-12 y de la carga de `permissions.json`; de `hasPermission` y `requirePermission`; del middleware (sin usuario, `false`, `true`, callback asíncrono, contexto recibido, error del callback). Las pruebas de datos existentes se migran al modelo con `permissions`.
