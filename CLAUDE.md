## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).


## Context Policy

Siempre consultar Graphify antes de explorar el código.

Abrir únicamente los archivos necesarios.

No analizar el repositorio completo.

Reutilizar el contexto ya cargado.

Evitar búsquedas globales innecesarias.

Priorizar bajo consumo de contexto.

# PAMPA

## Idioma

- Responder siempre en español.
- Código en inglés.
- Commits en inglés.
- Variables en inglés.
- Explicaciones en español.

## Eficiencia

- Consultar Graphify antes de recorrer el proyecto.
- Abrir únicamente los archivos necesarios.
- No releer archivos ya analizados.
- Minimizar el consumo de contexto y tokens.
- Trabajar un sprint a la vez.
- Antes de modificar código, explicar brevemente el plan.