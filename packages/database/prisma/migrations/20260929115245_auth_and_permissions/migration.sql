-- Phase 1 Sprint 1: email verification / password reset tokens, and a permission
-- model that allows several rules per role and permission (e.g. a parent may read
-- their own account AND their children's accounts) with field limits.

-- role_permissions is reference data owned by the seed (src/permission-matrix.ts),
-- which rewrites it on every deploy. Clearing it lets the new primary key be added.
DELETE FROM "role_permissions";

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');
-- AlterTable
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey",
ADD COLUMN     "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN     "terms_version" TEXT;
-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");
-- CreateIndex
CREATE INDEX "verification_tokens_user_id_purpose_idx" ON "verification_tokens"("user_id", "purpose");
-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");
-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
