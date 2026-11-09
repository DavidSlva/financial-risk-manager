# Plan — 006-modelo-datos

Spec: [../../specs/006-modelo-datos.md](../../specs/006-modelo-datos.md)

## Enfoque

Una función **pura** valida la integridad (recibe filas, devuelve violaciones); un almacén lee los archivos, los cachea por fecha de modificación y aplica esa función; tres servicios de lectura exponen los datos al resto de la app. Todo con TDD: cada regla nace de una prueba.

## Diseño

```
backend/
├── data/
│   ├── roles.json                # versionado
│   ├── users.example.json        # versionado, datos ficticios
│   ├── scores.example.json
│   ├── users.json                # ignorado en git
│   └── scores.json               # ignorado en git
├── src/
│   ├── config/environment.ts     # + DATA_DIR
│   ├── models/data.types.ts      # Role, User, Score, Violation
│   └── services/
│       ├── data-integrity.service.ts   # validateIntegrity({ roles, users, scores }): Violation[]
│       ├── data-store.service.ts       # lee, cachea por mtime, valida, falla cerrado
│       ├── roles.service.ts            # findRoleByName(name)
│       ├── users.service.ts            # findUserByRut(rut)
│       └── scores.service.ts           # findScoreByRut(rut)
└── test/                                # espejo de src/
    ├── config/environment.test.ts
    └── services/
        ├── data-integrity.service.test.ts
        ├── data-store.service.test.ts
        ├── roles.service.test.ts
        ├── users.service.test.ts
        └── scores.service.test.ts
```

Tipos: `Role { name; description }`, `User { rut; role; active }`, `Score { rut; score }`, `Violation { file; row?; rule; message }`.

La carpeta `models/` es nueva respecto a la spec 005: guarda solo tipos (sin lógica) y se documenta en `backend/README.md`.

## Decisiones técnicas

| Decisión                                       | Alternativas                    | Motivo                                                                        |
| ---------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `roles` como tabla propia con FK desde `users` | Enum fijo en código             | El rol es extensible; agregar uno no debe requerir un despliegue de código    |
| `roles.json` versionado                        | Ignorarlo con los datos         | No es dato personal y define la base del sistema                              |
| Validación pura en `data-integrity.service.ts` | Validar dentro del lector       | Se prueba sin tocar el disco                                                  |
| Validación manual sin librería                 | zod, ajv                        | Nueve reglas; evita dependencia nueva bajo cuarentena                         |
| Caché por `mtimeMs` con recarga                | Solo al arrancar; leer cada vez | La vigencia debe poder cambiar sin reiniciar y sin leer en cada request       |
| Fallar cerrado si la recarga no valida         | Conservar últimos datos válidos | Una revocación mal editada no debe dejar acceso abierto por usar datos viejos |
| `scores.rut` como PK y FK a `users.rut`        | Historial de scores por rut     | La app devuelve un score por rut; es lo más simple                            |
| `models/` solo con tipos                       | Tipos junto a cada servicio     | Los comparten servicios y validador; evita dependencias circulares            |
| Rut como identificador opaco hasta la spec 008 | Implementar el validador aquí   | Pedido explícito: queda como punto derivado                                   |

## Riesgos

- Edición manual con error de sintaxis: la app rechaza operaciones (falla cerrado) hasta que se corrija; se informa el motivo en el log.
- Lectura de archivo en el camino de cada validación: mitigado por el caché por `mtime` (un `stat` por consulta).
- Un rol referenciado que se elimina de `roles.json` deja usuarios huérfanos: IR-7 lo detecta y se falla cerrado.

## Verificación (TDD)

Una prueba por regla IR-1…IR-9 sobre la función pura (primero rojas), pruebas del almacén con archivos temporales (recarga por `mtime`, falla cerrado) y de los servicios de lectura. Después, arranque real con datos válidos e inválidos.
