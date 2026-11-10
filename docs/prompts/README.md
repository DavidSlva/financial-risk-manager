# Prompts

Registro de los prompts del usuario, en orden cronológico.

- Nombre: `YYYY-MM-DD_HHMM_NNN-slug.md` (hora local). `NNN` es la spec que origina el prompt; `000` para los transversales (varias specs o sin spec).
- Contenido: front matter (`datetime`, `spec`) + prompt textual.
- Se registran **todos** los prompts, incluidas las confirmaciones y órdenes de integración (push, merge, promoción, converge), no solo los que originan una spec.
- La hora sale de `date` o de git, **nunca estimada**. Si un prompt se registra después, el front matter lleva `registro: posterior` y la hora es la de la acción resultante.
- Cada prompt nuevo se agrega como un archivo nuevo; no se editan los anteriores.
- Si el prompt origina o modifica una spec, indicarla en `spec:` y enlazar el prompt desde la spec.
