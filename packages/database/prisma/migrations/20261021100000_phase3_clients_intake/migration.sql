-- CreateEnum
CREATE TYPE "ClientOrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ClientMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "HubIntakeStatus" AS ENUM ('UNCONFIRMED', 'NEW', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "HubIntakeSource" AS ENUM ('SITE', 'PORTAL');

-- CreateEnum
CREATE TYPE "HubBudget" AS ENUM ('UNDER_500', 'FROM_500', 'FROM_2000', 'FROM_5000', 'UNSURE');

-- CreateEnum
CREATE TYPE "HubProjectStatus" AS ENUM ('SCOPING', 'QUOTED', 'AWAITING_DEPOSIT', 'ACTIVE', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "client_orgs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "billing_name" TEXT,
    "billing_address" TEXT,
    "tax_id" TEXT,
    "contract_version" TEXT,
    "contract_signed_at" TIMESTAMP(3),
    "contract_signed_by_id" UUID,
    "status" "ClientOrgStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_members" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ClientMemberRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_intakes" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "source" "HubIntakeSource" NOT NULL,
    "status" "HubIntakeStatus" NOT NULL,
    "org_id" UUID,
    "created_by_id" UUID,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "country_code" CHAR(2),
    "language_code" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "budget" "HubBudget" NOT NULL,
    "deadline" DATE,
    "files" JSONB NOT NULL DEFAULT '[]',
    "token_hash" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "decided_by_id" UUID,
    "decided_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_projects" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "org_id" UUID NOT NULL,
    "intake_id" UUID,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "HubProjectStatus" NOT NULL DEFAULT 'SCOPING',
    "lead_id" UUID,
    "currency" CHAR(3) NOT NULL,
    "student_percent" SMALLINT NOT NULL,
    "lead_percent" SMALLINT NOT NULL,
    "platform_percent" SMALLINT NOT NULL,
    "deposit_percent" SMALLINT NOT NULL DEFAULT 30,
    "deadline" DATE,
    "repo" TEXT,
    "portfolio_allowed" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,

    CONSTRAINT "hub_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_members_user_id_key" ON "client_members"("user_id");

-- CreateIndex
CREATE INDEX "client_members_org_id_idx" ON "client_members"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "hub_intakes_number_key" ON "hub_intakes"("number");

-- CreateIndex
CREATE UNIQUE INDEX "hub_intakes_token_hash_key" ON "hub_intakes"("token_hash");

-- CreateIndex
CREATE INDEX "hub_intakes_status_created_at_idx" ON "hub_intakes"("status", "created_at");

-- CreateIndex
CREATE INDEX "hub_intakes_org_id_idx" ON "hub_intakes"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "hub_projects_number_key" ON "hub_projects"("number");

-- CreateIndex
CREATE UNIQUE INDEX "hub_projects_intake_id_key" ON "hub_projects"("intake_id");

-- CreateIndex
CREATE INDEX "hub_projects_org_id_created_at_idx" ON "hub_projects"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "hub_projects_lead_id_status_idx" ON "hub_projects"("lead_id", "status");

-- CreateIndex
CREATE INDEX "hub_projects_status_idx" ON "hub_projects"("status");

-- AddForeignKey
ALTER TABLE "client_orgs" ADD CONSTRAINT "client_orgs_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_orgs" ADD CONSTRAINT "client_orgs_contract_signed_by_id_fkey" FOREIGN KEY ("contract_signed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_members" ADD CONSTRAINT "client_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "client_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_members" ADD CONSTRAINT "client_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_intakes" ADD CONSTRAINT "hub_intakes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "client_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_intakes" ADD CONSTRAINT "hub_intakes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_intakes" ADD CONSTRAINT "hub_intakes_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_projects" ADD CONSTRAINT "hub_projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "client_orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_projects" ADD CONSTRAINT "hub_projects_intake_id_fkey" FOREIGN KEY ("intake_id") REFERENCES "hub_intakes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_projects" ADD CONSTRAINT "hub_projects_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_projects" ADD CONSTRAINT "hub_projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Written by hand ──────────────────────────────────────────────────────────

-- A project's split always adds up to 100%.
ALTER TABLE "hub_projects" ADD CONSTRAINT "hub_projects_split_check"
  CHECK ("student_percent" + "lead_percent" + "platform_percent" = 100
     AND "student_percent" >= 0 AND "lead_percent" >= 0 AND "platform_percent" >= 0
     AND "deposit_percent" BETWEEN 0 AND 100);
