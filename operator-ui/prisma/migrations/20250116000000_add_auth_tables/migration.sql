-- AlterTable: Add role column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT;

-- CreateTable: magic_links
CREATE TABLE IF NOT EXISTS "magic_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sessions
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "magic_links_email_expires_at_idx" ON "magic_links"("email", "expires_at");
CREATE INDEX IF NOT EXISTS "magic_links_token_hash_idx" ON "magic_links"("token_hash");
CREATE INDEX IF NOT EXISTS "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create owner user if not exists
INSERT INTO "users" ("id", "email", "role", "created_at")
VALUES (gen_random_uuid(), 'aaronhenry1981@gmail.com', 'owner', CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO UPDATE SET "role" = 'owner'
WHERE "users"."email" = 'aaronhenry1981@gmail.com';





