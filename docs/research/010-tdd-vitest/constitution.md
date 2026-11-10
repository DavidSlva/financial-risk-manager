# Constitution — 010-tdd-vitest

Spec: [../../specs/010-tdd-vitest.md](../../specs/010-tdd-vitest.md)

## Principios y restricciones

- TDD: la prueba precede al código (rojo → verde → refactor).
- Las pruebas viven en `test/` y replican la estructura de `src/`.
- Ejecutor: Vitest. Sin otras librerías de prueba salvo necesidad demostrada.
- El CI ejecuta las mismas pruebas que se corren en local.
- Toda dependencia entra por `pnpm add` bajo la cuarentena de 7 días y sin scripts de ciclo de vida (spec 004).

## Contexto investigado

- Vitest 5.1.0 cumple la cuarentena y su instalación no requiere scripts de ciclo de vida.
- Vite resuelve imports `./x.js` hacia `./x.ts`, compatible con `moduleResolution: NodeNext`.
- Express 5 y `fetch` nativo de Node 22 bastan para pruebas HTTP sin librerías.

## Preguntas abiertas

- Entorno DOM para React, cobertura, pruebas en `pre-commit`.
