---
datetime: 2026-11-09 19:46
spec: 005-backend-estructura
---

Respecto al diseño, es una app pequeña, por lo que usaremos express.js. La estructura de carpetas del backend contiene un README.md propio, que señala la intención de la carpeta: src/ como base, config/ con la configuración y validación de variables de entorno (enviroment.ts), controllers/ como capa que recibe las peticiones http, extrae datos de las request. Middlewares, que viven en cualquier parte del ciclo de vida de la petición. routes con las rutas, contiene un enrutador principal que une las rutas particulares, services como capa de negocio. La estructura de archivos en estas carpetas, cuando corresponda, está basada en Feature-Driven Separation, <recurso>.<capa>.<extensión>. Recurso es el nombre de la entidad o dominio, capa el rol arquitectonico, extensión se subentiende.
