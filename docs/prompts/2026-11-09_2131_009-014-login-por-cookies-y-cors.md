---
datetime: 2026-11-09 21:31
spec: 009-emision-tokens, 014-cors-desarrollo, 002-flujo-git-agentes
---

Luego revisamos el tag, por definición, siempre el último spec publicado. Necesitamos modificar la spec de login, el login se hace meidante JWT por cookies, el front esperará eso, funcionan bajo el mismo dominio. Pero configura el CORS para desarrollo, por defecto. Usaremos localhost:3000 para el front y 8000 para el back.
