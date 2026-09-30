-- Phase 1b: quizzes and daily practice (graded on the server), push notification
-- tokens, first-party crash reports from the mobile app, and the parent switch for
-- streak reminders on a child's phone.

-- CreateEnum
CREATE TYPE "QuizKind" AS ENUM ('ORDER', 'BUG', 'OUTPUT', 'CHOICE');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "XpSource" ADD VALUE 'QUIZ';
ALTER TYPE "XpSource" ADD VALUE 'PRACTICE';

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "streak_reminders" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "kind" "QuizKind" NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 5,
    "code_language" TEXT,
    "code" JSONB,
    "options" JSONB,
    "answer" JSONB NOT NULL,
    "texts" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "quiz_ids" JSONB NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "language_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_crashes" (
    "id" UUID NOT NULL,
    "app_version" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "os_version" TEXT NOT NULL,
    "fatal" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_crashes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quizzes_lesson_id_sort_order_idx" ON "quizzes"("lesson_id", "sort_order");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_quiz_id_idx" ON "quiz_attempts"("user_id", "quiz_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_created_at_idx" ON "quiz_attempts"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "app_crashes_created_at_idx" ON "app_crashes"("created_at");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

