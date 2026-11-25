ALTER TABLE "events"
ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 50;

CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mobile_login_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_login_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_registrations_eventId_userId_key"
ON "event_registrations"("eventId", "userId");

CREATE INDEX "event_registrations_userId_idx"
ON "event_registrations"("userId");

CREATE UNIQUE INDEX "mobile_login_challenges_codeHash_key"
ON "mobile_login_challenges"("codeHash");

CREATE INDEX "mobile_login_challenges_userId_expiresAt_idx"
ON "mobile_login_challenges"("userId", "expiresAt");

ALTER TABLE "event_registrations"
ADD CONSTRAINT "event_registrations_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_registrations"
ADD CONSTRAINT "event_registrations_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mobile_login_challenges"
ADD CONSTRAINT "mobile_login_challenges_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
