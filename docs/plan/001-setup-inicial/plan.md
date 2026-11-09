# Plan — 001-setup-inicial
Spec: [../../specs/001-setup-inicial.md](../../specs/001-setup-inicial.md)

## Enfoque
Solo carpetas, READMEs y plantillas; sin tooling.

## Decisiones técnicas
| Decisión | Alternativas | Motivo |
|----------|--------------|--------|
| Ids `NNN-slug` compartidos entre spec y carpetas RPI | Subcarpeta por spec | Specs planas facilitan el índice y el grafo |
| Relaciones en front matter + índice con Mermaid | Solo índice | Legible por humanos y parseable por herramientas |
| Constitution por spec dentro de `research/` | Una constitution global | Pedido explícito: constitution vive en Research |
