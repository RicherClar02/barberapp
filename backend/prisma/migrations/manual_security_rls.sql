-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN MANUAL DE SEGURIDAD — Defensa en profundidad en PostgreSQL
-- ═══════════════════════════════════════════════════════════════════
--
-- ⚠ NO la aplica `prisma migrate` automáticamente. Ejecutar a mano como
--   superusuario de PostgreSQL, SOLO en producción:
--
--     psql "$DATABASE_URL_SUPERUSER" -f prisma/migrations/manual_security_rls.sql
--
-- ⚠ EN DESARROLLO NO APLICAR: el usuario de la app suele ser el dueño
--   del schema y los REVOKE romperían `prisma migrate dev`.
--
-- Idea: aunque alguien comprometa la API, el usuario de BD de la app
-- no puede borrar el historial (citas, pagos, reseñas la borra solo
-- el moderador vía un usuario administrativo).

-- ─── 1. Usuario de solo lectura para reportes futuros ────────────────
-- Cambiar 'CAMBIAR_PASSWORD' por una contraseña fuerte antes de ejecutar.
CREATE ROLE barberapp_readonly LOGIN PASSWORD 'CAMBIAR_PASSWORD';
GRANT CONNECT ON DATABASE barberapp_db TO barberapp_readonly;
GRANT USAGE ON SCHEMA public TO barberapp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO barberapp_readonly;
-- Que las tablas futuras también sean legibles:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO barberapp_readonly;

-- ─── 2. Usuario de aplicación SIN permiso de DELETE en tablas críticas ─
-- La app usa soft delete (status CANCELLED, isActive=false), así que no
-- necesita DELETE en estas tablas. Crear un usuario dedicado para la app
-- (no usar el dueño del schema en producción):
CREATE ROLE barberapp_app LOGIN PASSWORD 'CAMBIAR_PASSWORD';
GRANT CONNECT ON DATABASE barberapp_db TO barberapp_app;
GRANT USAGE ON SCHEMA public TO barberapp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO barberapp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO barberapp_app;

-- Quitar DELETE del historial crítico:
REVOKE DELETE ON appointments FROM barberapp_app;
REVOKE DELETE ON payments     FROM barberapp_app;
-- NOTA: reviews mantiene DELETE porque el flujo de moderación del ADMIN
-- (DELETE /api/admin/reviews/:id) elimina reseñas fraudulentas. Si se
-- migra ese flujo a soft delete, descomentar:
-- REVOKE DELETE ON reviews FROM barberapp_app;

-- ─── 3. Activar en producción ────────────────────────────────────────
-- Apuntar DATABASE_URL de la app al nuevo usuario:
--   DATABASE_URL=postgresql://barberapp_app:PASSWORD@host:5432/barberapp_db
-- Las migraciones de Prisma se siguen corriendo con el usuario dueño
-- del schema (deploy controlado), NO con barberapp_app.
