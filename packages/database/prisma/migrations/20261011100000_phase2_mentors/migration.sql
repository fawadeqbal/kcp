-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('PROJECT', 'READINESS');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('WAITING', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "mentor_profiles" (
    "user_id" UUID NOT NULL,
    "background_check" "BackgroundCheckStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "background_checked_at" TIMESTAMP(3),
    "background_check_note" TEXT,
    "code_of_conduct_version" TEXT,
    "code_of_conduct_signed_at" TIMESTAMP(3),
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "capacity" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "kind" "ReviewKind" NOT NULL DEFAULT 'PROJECT',
    "student_id" UUID NOT NULL,
    "project_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "files" JSONB NOT NULL,
    "language_code" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'WAITING',
    "mentor_id" UUID,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "turnaround_hours" DOUBLE PRECISION,
    "scores" JSONB NOT NULL DEFAULT '{}',
    "summary" TEXT,
    "seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comments" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "author_id" UUID,
    "file" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_notes" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_status_requested_at_idx" ON "reviews"("status", "requested_at");

-- CreateIndex
CREATE INDEX "reviews_student_id_created_at_idx" ON "reviews"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_mentor_id_status_idx" ON "reviews"("mentor_id", "status");

-- CreateIndex
CREATE INDEX "reviews_project_id_idx" ON "reviews"("project_id");

-- CreateIndex
CREATE INDEX "review_comments_review_id_idx" ON "review_comments"("review_id");

-- CreateIndex
CREATE INDEX "mentor_notes_student_id_created_at_idx" ON "mentor_notes"("student_id", "created_at");

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_notes" ADD CONSTRAINT "mentor_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_notes" ADD CONSTRAINT "mentor_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written: one open review (waiting or being reviewed) per project at a time.
CREATE UNIQUE INDEX "reviews_one_open_per_project" ON "reviews" ("project_id")
  WHERE "status" IN ('WAITING', 'IN_REVIEW') AND "project_id" IS NOT NULL;
