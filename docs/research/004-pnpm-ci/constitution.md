# Constitution — 004-pnpm-ci

Spec: [../../specs/004-pnpm-ci.md](../../specs/004-pnpm-ci.md)

## Principios y restricciones

- pnpm es el único gestor. Sin npm ni yarn.
- Ninguna dependencia ejecuta scripts de ciclo de vida; `allowBuilds` queda vacío.
- Todo paquete nuevo debe tener al menos 7 días de publicado, sin excepciones ni fallback.
- Fuentes ocultas (git/tarball por URL) bloqueadas en dependencias transitivas.
- El CI valida lo mismo que los hooks y nunca modifica código (Prettier solo valida).
- Acciones de GitHub fijadas por SHA y sujetas a la misma cuarentena.

## Contexto investigado

- pnpm 12.x. Ajustes usados (documentación oficial de pnpm): `minimumReleaseAge` (minutos), `minimumReleaseAgeStrict`, `blockExoticSubdeps`, `allowBuilds`, `strictDepBuilds`.
- Los scripts de ciclo de vida de dependencias están bloqueados salvo los listados en `allowBuilds`; los del proyecto raíz (como `prepare` de Husky) sí corren.
- En esta fecha (2026-11-09): `pnpm@12.18.0` y `typescript-eslint@8.72.2` tenían menos de 7 días; `pnpm/action-setup@v6.1.1` tenía 6 días.
- `typescript-eslint@8.72.x` acepta TypeScript `<6.1.0`.

## Preguntas abiertas

- Check requerido en GitHub y Dependabot/Renovate con cooldown: fuera de esta spec.
