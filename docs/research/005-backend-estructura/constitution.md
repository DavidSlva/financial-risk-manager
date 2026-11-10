# Constitution — 005-backend-estructura

Spec: [../../specs/005-backend-estructura.md](../../specs/005-backend-estructura.md)

## Principios y restricciones

- App pequeña: Express, sin capas adicionales ni abstracciones que no se necesiten.
- Cada carpeta tiene una responsabilidad única y está explicada en `backend/README.md`.
- Separación de capas: los controladores no tienen negocio; los servicios no conocen Express.
- Feature-Driven Separation: `<recurso>.<capa>.<extensión>`.
- Solo `config/environment.ts` lee `process.env`.
- Toda dependencia nueva entra por `pnpm add` bajo la cuarentena de 7 días (spec 004).

## Contexto investigado

- Express 5 maneja errores de handlers asíncronos sin envoltorios adicionales.
- `moduleResolution: NodeNext` (spec 003) exige extensión `.js` en imports relativos.

## Preguntas abiertas

- Scripts de `dev`/`build`/`start`, tests y Dockerfile quedan para specs posteriores.
