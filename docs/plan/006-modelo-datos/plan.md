# Plan — 006-modelo-datos

Spec: [../../specs/006-modelo-datos.md](../../specs/006-modelo-datos.md)

## Enfoque

Una función **pura** valida la integridad (recibe filas, devuelve violaciones); un almacén lee los archivos, los cachea por fecha de modificación y aplica esa función; dos servicios de lectura exponen los datos al resto de la app.

## Diseño

```
backend/
├── data/
│   ├── users.example.json        # versionado, datos ficticios
│   ├── scores.example.json
│   ├── users.json                # ignorado en git
│   └── scores.json               # ignorado en git
└── src/
    ├── config/environment.ts     # + DATA_DIR
    └── services/
        ├── data-integrity.service.ts   # validateIntegrity(users, scores): Violation[]
        ├── data-store.service.ts       # lee, cachea por mtime, valida, falla cerrado
        ├── users.service.ts            # findUserByRut(rut)
        └── scores.service.ts           # findScoreByRut(rut)
```

Tipos: `User { rut: string; role: 'admin' | 'user'; active: boolean }`, `Score { rut: string; score: number }`, `Violation { file; row?; rule; message }`.

## Decisiones técnicas

| Decisión                                           | Alternativas                    | Motivo                                                                        |
| -------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Validación pura en `data-integrity.service.ts`     | Validar dentro del lector       | Se prueba sin tocar el disco                                                  |
| Validación manual sin librería                     | zod, ajv                        | Nueve reglas; evita dependencia nueva bajo cuarentena                         |
| Caché por `mtimeMs` con recarga                    | Solo al arrancar; leer cada vez | La vigencia debe poder cambiar sin reiniciar y sin leer en cada request       |
| Fallar cerrado si la recarga no valida             | Conservar últimos datos válidos | Una revocación mal editada no debe dejar acceso abierto por usar datos viejos |
| Datos reales en `.gitignore`, ejemplos versionados | Versionar todo                  | Los ruts son datos personales                                                 |
| `scores.rut` como PK y FK a `users.rut`            | Historial de scores por rut     | La app devuelve un score por rut; es lo más simple                            |
| Rut como identificador opaco hasta la spec 008     | Implementar el validador aquí   | Pedido explícito: queda como punto derivado                                   |

## Riesgos

- Edición manual con error de sintaxis: la app rechaza operaciones (falla cerrado) hasta que se corrija; se informa el motivo en el log.
- Lectura de archivo en el camino de cada validación: mitigado por el caché por `mtime` (un `stat` por consulta).

## Verificación

Casos de prueba de la función pura para cada regla IR-1…IR-9 (ver tasks), más arranque real con datos válidos e inválidos.
