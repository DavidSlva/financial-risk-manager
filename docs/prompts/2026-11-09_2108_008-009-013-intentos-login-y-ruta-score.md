---
datetime: 2026-11-09 21:08
spec: 009-emision-tokens, 013-consulta-score, 008-validador-rut
---

Respecto al login, necesitamos incorporar un límite de intentos, quedará como un nuevo campo en el modelo usuario, como contador que se reinicia con un login exitoso, el máximo, definido en la config. E ncuanto a la ruta de la api, quiero que lo llamemos score, no scores, que sea api/score/:rut. Aunque como convención, seguiremos usando nombres plurales para los recursos. Luego de eso, implementemos con TDD las specs 8 y 9.
