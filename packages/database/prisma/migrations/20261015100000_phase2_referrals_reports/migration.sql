-- CreateEnum
CREATE TYPE "PremiumGrantSource" AS ENUM ('STAFF', 'REFERRAL', 'SCHOOL');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REWARDED', 'NOT_REWARDED');

-- DropForeignKey
ALTER TABLE "premium_grants" DROP CONSTRAINT "premium_grants_granted_by_id_fkey";

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "premium_grants" ADD COLUMN     "referral_id" UUID,
ADD COLUMN     "source" "PremiumGrantSource" NOT NULL DEFAULT 'STAFF',
ALTER COLUMN "granted_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "weekly_report_emails" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "invitee_id" UUID NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "invitee_network_hash" TEXT,
    "reward_days" INTEGER,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_activity_days" (
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_activity_days_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateTable
CREATE TABLE "parent_reports" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "week_key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "emailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "names" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_invitee_id_key" ON "referrals"("invitee_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_status_decided_at_idx" ON "referrals"("referrer_id", "status", "decided_at");

-- CreateIndex
CREATE UNIQUE INDEX "parent_reports_parent_id_week_key_key" ON "parent_reports"("parent_id", "week_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_activity_days" ADD CONSTRAINT "student_activity_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_reports" ADD CONSTRAINT "parent_reports_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_grants" ADD CONSTRAINT "premium_grants_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_grants" ADD CONSTRAINT "premium_grants_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

