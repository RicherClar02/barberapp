Contexto: BarberApp — el backend crashea al arrancar
por ReferenceError: authMiddleware is not defined en
src/routes/admin.routes.js línea 6.

TAREA:
1. Abrir src/routes/admin.routes.js
2. Verificar que estén los imports al inicio del archivo:
   const authMiddleware = require('../middleware/auth.middleware');
   const { requireRole } = require('../middleware/role.middleware');
   (o donde estén realmente definidos — buscar los archivos)
3. Confirmar que se exporte correctamente authMiddleware
   como función default en auth.middleware.js
4. Si el middleware existe pero se exporta con nombre
   diferente (ej: authenticate, verifyToken), ajustar
   el import
5. Verificar que TODOS los routes files tengan sus
   imports correctos (revisar los archivos en /routes)
6. npm run dev debe arrancar sin errores
7. GET /health debe responder 200

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
