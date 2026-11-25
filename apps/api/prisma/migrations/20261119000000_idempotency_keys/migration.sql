-- Idempotencia para escrituras críticas (inscripción a eventos).
-- Permite reintentar POST /events/:id/register sin crear duplicados.
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_key_key" ON "idempotency_keys"("key");
CREATE INDEX IF NOT EXISTS "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");
CREATE INDEX IF NOT EXISTS "idempotency_keys_scope_status_idx" ON "idempotency_keys"("scope", "status");
