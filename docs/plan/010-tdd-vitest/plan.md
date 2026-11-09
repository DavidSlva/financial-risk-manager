# Plan — 010-tdd-vitest

Spec: [../../specs/010-tdd-vitest.md](../../specs/010-tdd-vitest.md)

## Enfoque

Vitest por workspace, con su propio `vitest.config.ts`, y un script raíz que los ejecuta todos. Se cubre primero el código ya existente para dejar una base verde antes de las specs 006 y 007.

## Decisiones técnicas

| Decisión                                               | Alternativas               | Motivo                                                             |
| ------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------ |
| Vitest instalado en cada workspace                     | Una instalación en la raíz | Cada workspace ejecuta su binario sin depender del PATH de la raíz |
| `test/` espejo de `src/`                               | Pruebas junto al código    | Pedido explícito; separa el código de producción de las pruebas    |
| Sufijo `.test.ts` con la convención `<recurso>.<capa>` | `.spec.ts`                 | Evita confundir con las "specs" de la metodología                  |
| Sin globales de Vitest                                 | `globals: true`            | Imports explícitos, sin tipos globales extra en `tsconfig`         |
| `fetch` y puerto efímero para pruebas HTTP             | supertest                  | Sin dependencia adicional                                          |
| Frontend con `passWithNoTests`                         | Prueba artificial          | No hay código que probar; una prueba vacía sería ruido             |
| Paso de pruebas en CI tras `tsc`                       | Job separado               | Reutiliza la instalación; el tiempo total es bajo                  |
| Pruebas solo en CI, no en `pre-commit`                 | Pre-commit también         | Mantiene el commit rápido; decisión revisable                      |

## Verificación

`pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`; el paso nuevo del CI se confirmará en la primera ejecución en GitHub.
