-- Práctica 12: índice compuesto para las consultas públicas de eventos.
-- Cubre `GET /events` (isActive = true ORDER BY date) y
-- `GET /events/upcoming` (isActive = true AND date >= now() ORDER BY date).
-- En Neon/producción se aplicó con CREATE INDEX CONCURRENTLY para no bloquear
-- escrituras; el archivo de migración usa la forma estándar porque Prisma
-- ejecuta cada migración dentro de una transacción.
CREATE INDEX IF NOT EXISTS "events_isActive_date_idx" ON "events" ("isActive", "date");
