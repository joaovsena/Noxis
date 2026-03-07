-- Permite ate 3 personagens por conta:
-- remove unicidade de userId em Player e cria slot por conta.

ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "slot" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "Player_userId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Player_userId_slot_key" ON "Player"("userId", "slot");
