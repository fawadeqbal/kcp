-- CreateEnum
CREATE TYPE "HubMemberStatus" AS ENUM ('INVITED', 'ACCEPTED', 'APPROVED', 'DECLINED', 'REMOVED');

-- CreateEnum
CREATE TYPE "HubReviewDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- AlterEnum
ALTER TYPE "ChatRoomKind" ADD VALUE 'HUB';

-- CreateTable
CREATE TABLE "hub_members" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "HubMemberStatus" NOT NULL DEFAULT 'INVITED',
    "pseudonym" TEXT NOT NULL,
    "task_id" UUID,
    "note" TEXT,
    "invited_by_id" UUID,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMP(3),
    "parent_id" UUID,
    "decided_at" TIMESTAMP(3),
    "declined_by" TEXT,
    "removed_at" TIMESTAMP(3),
    "removed_reason" TEXT,

    CONSTRAINT "hub_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_time_entries" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "minutes" SMALLINT NOT NULL DEFAULT 0,
    "week_key" TEXT NOT NULL,
    "stopped_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_code_reviews" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "student_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "pull_number" INTEGER NOT NULL,
    "commit" TEXT NOT NULL,
    "decision" "HubReviewDecision" NOT NULL,
    "score" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_code_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hub_members_student_id_status_idx" ON "hub_members"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hub_members_project_id_student_id_key" ON "hub_members"("project_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "hub_members_project_id_pseudonym_key" ON "hub_members"("project_id", "pseudonym");

-- CreateIndex
CREATE INDEX "hub_time_entries_student_id_week_key_idx" ON "hub_time_entries"("student_id", "week_key");

-- CreateIndex
CREATE INDEX "hub_time_entries_task_id_idx" ON "hub_time_entries"("task_id");

-- CreateIndex
CREATE INDEX "hub_time_entries_ended_at_idx" ON "hub_time_entries"("ended_at");

-- CreateIndex
CREATE INDEX "hub_code_reviews_student_id_created_at_idx" ON "hub_code_reviews"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "hub_code_reviews_project_id_pull_number_idx" ON "hub_code_reviews"("project_id", "pull_number");

-- AddForeignKey
ALTER TABLE "hub_members" ADD CONSTRAINT "hub_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_members" ADD CONSTRAINT "hub_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_members" ADD CONSTRAINT "hub_members_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "hub_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_members" ADD CONSTRAINT "hub_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_members" ADD CONSTRAINT "hub_members_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_time_entries" ADD CONSTRAINT "hub_time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_time_entries" ADD CONSTRAINT "hub_time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "hub_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_time_entries" ADD CONSTRAINT "hub_time_entries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_code_reviews" ADD CONSTRAINT "hub_code_reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_code_reviews" ADD CONSTRAINT "hub_code_reviews_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "hub_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_code_reviews" ADD CONSTRAINT "hub_code_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_code_reviews" ADD CONSTRAINT "hub_code_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Written by hand ──────────────────────────────────────────────────────────

ALTER TABLE "hub_code_reviews" ADD CONSTRAINT "hub_code_reviews_score_check" CHECK ("score" BETWEEN 1 AND 5);
ALTER TABLE "hub_time_entries" ADD CONSTRAINT "hub_time_entries_minutes_check" CHECK ("minutes" >= 0);

-- One running timer per student.
CREATE UNIQUE INDEX "hub_time_entries_one_running" ON "hub_time_entries" ("student_id") WHERE "ended_at" IS NULL;
