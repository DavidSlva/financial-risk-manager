# Plan — 004-pnpm-ci

Spec: [../../specs/004-pnpm-ci.md](../../specs/004-pnpm-ci.md)

## Enfoque

La política vive en `pnpm-workspace.yaml` y la aplica pnpm al instalar. Un script sin dependencias (`scripts/check-pnpm-policy.mjs`) evita que alguien la debilite sin que el CI lo note. El CI es un único job con los mismos pasos que los hooks.

## Decisiones técnicas

| Decisión                                              | Alternativas                     | Motivo                                                                   |
| ----------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `minimumReleaseAgeStrict: true`                       | Solo `minimumReleaseAge`         | Sin strict, pnpm cae a una versión más nueva si no hay una madura        |
| Script de política propio sin dependencias            | Paquete `yaml`                   | Una dependencia nueva entraría a la cuarentena y ampliaría la superficie |
| Fijar acciones por SHA con comentario de versión      | Tags `@v7`                       | Los tags son móviles; el SHA es inmutable                                |
| `pnpm/action-setup` lee `packageManager`              | Versión duplicada en el workflow | Una sola fuente de verdad                                                |
| `HUSKY=0` en CI                                       | Instalar hooks en CI             | Los hooks no corren en CI                                                |
| Commitlint solo en `pull_request` con rango base…head | Comando en cada push             | En push a ramas nuevas el rango anterior no existe                       |
| `typescript@~6.0.0`                                   | `typescript@7`                   | `typescript-eslint` exige `<6.1.0`                                       |
| Un job (`Validar`)                                    | Varios jobs en paralelo          | Instalar una vez; el tiempo total es bajo                                |

## Orden de pasos del CI

1. Checkout (historial completo, sin guardar credenciales).
2. pnpm + Node (`.nvmrc`) con caché.
3. Política de cadena de suministro.
4. `pnpm install --frozen-lockfile`.
5. Prettier `--check`, ESLint, `tsc`.
6. Commitlint (solo PR).
