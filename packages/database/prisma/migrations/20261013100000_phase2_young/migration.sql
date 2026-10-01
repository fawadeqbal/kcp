-- CreateEnum
CREATE TYPE "Under13ConsentMethod" AS ENUM ('CARD_CHECK', 'SIGNED_FORM', 'EMAIL_PLUS');

-- CreateEnum
CREATE TYPE "ParentalConsentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "ConsentMethod" ADD VALUE 'EMAIL_PLUS';

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING_CONSENT';

-- AlterEnum
ALTER TYPE "VerificationPurpose" ADD VALUE 'PARENTAL_CONSENT';

-- AlterTable
ALTER TABLE "countries" ADD COLUMN     "under13_consent_methods" "Under13ConsentMethod"[] DEFAULT ARRAY[]::"Under13ConsentMethod"[];

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "picture_failures" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "picture_locked_until" TIMESTAMP(3),
ADD COLUMN     "picture_password_hash" TEXT;

-- CreateTable
CREATE TABLE "parental_consent_requests" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "method" "Under13ConsentMethod",
    "status" "ParentalConsentStatus" NOT NULL DEFAULT 'PENDING',
    "policy_version" TEXT NOT NULL,
    "provider_ref" TEXT,
    "form_key" TEXT,
    "form_content_type" TEXT,
    "form_deleted_at" TIMESTAMP(3),
    "email_confirmed_at" TIMESTAMP(3),
    "follow_up_sent_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "decided_by_id" UUID,
    "reject_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parental_consent_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_pairings" (
    "id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "child_id" UUID,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parental_consent_requests_provider_ref_key" ON "parental_consent_requests"("provider_ref");

-- CreateIndex
CREATE INDEX "parental_consent_requests_child_id_created_at_idx" ON "parental_consent_requests"("child_id", "created_at");

-- CreateIndex
CREATE INDEX "parental_consent_requests_status_submitted_at_idx" ON "parental_consent_requests"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "parental_consent_requests_parent_id_idx" ON "parental_consent_requests"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairings_code_hash_key" ON "device_pairings"("code_hash");

-- CreateIndex
CREATE INDEX "device_pairings_expires_at_idx" ON "device_pairings"("expires_at");

-- AddForeignKey
ALTER TABLE "parental_consent_requests" ADD CONSTRAINT "parental_consent_requests_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parental_consent_requests" ADD CONSTRAINT "parental_consent_requests_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parental_consent_requests" ADD CONSTRAINT "parental_consent_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairings" ADD CONSTRAINT "device_pairings_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairings" ADD CONSTRAINT "device_pairings_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
