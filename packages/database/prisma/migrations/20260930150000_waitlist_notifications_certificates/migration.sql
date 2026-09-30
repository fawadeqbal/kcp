-- CreateEnum
CREATE TYPE "WaitlistAgeBand" AS ENUM ('AGE_9_12', 'AGE_13_16');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "trial_reminder_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "monthly_summary_emails" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "age_band" "WaitlistAgeBand" NOT NULL,
    "language_code" TEXT NOT NULL,
    "token_hash" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "module_id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "module_titles" JSONB NOT NULL,
    "track_titles" JSONB NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_token_hash_key" ON "waitlist_entries"("token_hash");

-- CreateIndex
CREATE INDEX "waitlist_entries_country_code_confirmed_at_idx" ON "waitlist_entries"("country_code", "confirmed_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_id_module_id_key" ON "certificates"("user_id", "module_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────
-- Hand-written
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_code_format"
  CHECK ("code" ~ '^KCP-[0-9A-Z]{4}-[0-9A-Z]{4}$');
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_email_lowercase"
  CHECK ("email" = lower("email"));
