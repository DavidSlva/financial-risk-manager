# Documentación

Metodología: **SDD corto** (6 etapas) sobre documentación **RPI**.

## Etapas

| #   | Etapa        | Qué se hace                                                  | Dónde vive                              |
| --- | ------------ | ------------------------------------------------------------ | --------------------------------------- |
| 1   | Constitution | Principios, restricciones y contexto investigado             | `research/<spec-id>/constitution.md`    |
| 2   | Specify      | Qué y por qué. Documento central que conecta todo            | `specs/<spec-id>.md`                    |
| 3   | Plan         | Cómo: arquitectura, decisiones, diseño técnico               | `plan/<spec-id>/plan.md`                |
| 4   | Tasks        | Descomposición en tareas verificables                        | `implementation/<spec-id>/tasks.md`     |
| 5   | Implement    | Registro de ejecución de las tareas                          | `implementation/<spec-id>/implement.md` |
| 6   | Converge     | Cierre: actualizar la spec y revisar documentos relacionados | `specs/<spec-id>.md` + sus enlaces      |

## Estructura

```
docs/
├── specs/            # Fuente de verdad. Una spec por unidad de trabajo; forman un grafo
│   ├── README.md     # Índice del grafo de specs
│   └── _templates/   # Plantillas de spec, constitution, plan, tasks, implement
├── research/         # RPI-R: constitution e investigación (por spec)
├── plan/             # RPI-P: planes (por spec)
├── implementation/   # RPI-I: tasks e implement (por spec)
└── prompts/          # Historial de prompts con fecha y hora
```

## Reglas

1. **La spec es el hub.** Tiene el detalle general y un índice hacia sus documentos RPI. No duplica su contenido: lo enlaza.
2. **Specs en grafo.** Cada spec declara en su front matter `depends_on`, `related`, `supersedes`/`superseded_by`. Toda relación se refleja en el índice `specs/README.md`.
3. **Ids:** `NNN-slug` (ej. `001-setup-inicial`). El mismo id se usa en la spec y en las carpetas RPI.
4. **Converge (obligatorio al cerrar):**
   - Actualizar la spec con un **resumen del estado final** de la implementación y su `status`.
   - Revisar que constitution, plan, tasks e implement reflejen lo realmente construido; corregirlos si no.
   - Revisar las specs relacionadas (`depends_on`/`related`) y actualizar enlaces y estado.
   - Actualizar el índice `specs/README.md`.
5. **Prompts:** cada prompt del usuario se registra en `prompts/` (ver `prompts/README.md`).
