# Frontend

SPA React + TypeScript con Vite. En producción genera un bundle estático con nombres hasheados y código minificado/anonimizado.
Estructura y tooling pendientes de definir mediante una spec (ver `docs/specs/`).

## Pruebas e2e del diseño (Playwright, spec 014)

Los scripts viven en `e2e/` y corren contra Vite (puerto 5299, levantado y detenido por Playwright; no reutiliza otro servidor) y contra la vista previa `/dev/login-states` (solo desarrollo).

- Primera vez (descarga explícita del navegador, no es un script de ciclo de vida): `pnpm --filter @financial-risk-manager/frontend run e2e:install`.
- Ejecutar: `pnpm --filter @financial-risk-manager/frontend run test:e2e`.
- Las capturas de cada estado (390 y 1280 px) están versionadas en `e2e/__screenshots__/`. Si un cambio de diseño es intencional, regenerar la línea base con `pnpm --filter @financial-risk-manager/frontend exec playwright test --update-snapshots=all`, revisar las imágenes y commitearlas.
- Las líneas base se generaron con Chromium en Windows y pueden diferir en otras plataformas (el CI no corre Playwright). `--update-snapshots=all` es lo que las regenera; la forma `-- --update-snapshots` no las reescribió.
- `bundle.spec.ts` compila en un directorio temporal (no toca `dist/`) y comprueba que la vista previa no entra al bundle de producción.
- El CI no corre Playwright (solo Vitest).

## Probar de inicio a fin (login y score)

Desarrollo local con el backend real (puertos libres a elección; el frontend usa `localhost`, nunca `127.0.0.1`):

1. Datos: copiar `backend/data/users.example.json` y `scores.example.json` a `users.json` y `scores.json` (no se versionan; la contraseña de ejemplo está en `backend/README.md`).
2. Backend: variables `JWT_SECRET` (`pnpm --filter @financial-risk-manager/backend run generate-secret`), `PORT` y `CORS_ORIGINS=<origen del frontend>`.
3. Frontend: `VITE_API_BASE_URL=http://localhost:<puerto-backend>/api pnpm --filter @financial-risk-manager/frontend exec vite --port <puerto>`. Sin esa variable, el cliente usa `/api` (mismo dominio).
