# Plan — 003-tooling

Spec: [../../specs/003-tooling.md](../../specs/003-tooling.md)

## Enfoque

Configuración en la raíz compartida por ambos workspaces; cada workspace solo declara `engines`, su `tsconfig` y el script `typecheck`.

## Decisiones técnicas

| Decisión                                        | Alternativas                   | Motivo                                                            |
| ----------------------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| npm workspaces                                  | pnpm, yarn                     | Viene con Node; sin instalar nada extra. Reversible.              |
| `.nvmrc` = `22.22`; `engines` = `>=22.22.0 <23` | Versión exacta                 | Acepta parches de 22.x, bloquea mayores                           |
| ESLint flat config + `eslint-config-prettier`   | `eslint-plugin-prettier`       | Prettier corre aparte (más rápido); ESLint solo desactiva choques |
| `tsc --noEmit` por workspace en `pre-commit`    | tsc solo sobre archivos staged | `tsc` necesita el proyecto completo para ser fiable               |
| Husky + lint-staged                             | simple-git-hooks, lefthook     | Estándar, simple                                                  |
| Regla de scope como plugin inline de Commitlint | `scope-enum` con lista fija    | El id crece con cada spec; una lista exigiría mantenimiento       |
| `.gitattributes` con `eol=lf`                   | Dejar `autocrlf`               | Evita ruido CRLF en Windows y alinea con Prettier (`lf`)          |

## Orden de ejecución del pre-commit

1. lint-staged: ESLint `--fix` y Prettier sobre staged.
2. `npm run typecheck` (todos los workspaces).
3. `commit-msg`: Commitlint.
