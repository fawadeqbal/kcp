-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('IMPORT', 'STUDIO');

-- CreateEnum
CREATE TYPE "ContentEntity" AS ENUM ('LESSON', 'CHALLENGE', 'PROJECT', 'QUIZ');

-- CreateEnum
CREATE TYPE "ContentDraftStatus" AS ENUM ('DRAFT', 'IN_REVIEW');

-- CreateEnum
CREATE TYPE "ContentVersionAction" AS ENUM ('IMPORT', 'PUBLISH');

-- AlterTable
ALTER TABLE "challenge_translations" ADD COLUMN     "import_hash" TEXT,
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'IMPORT';

-- AlterTable
ALTER TABLE "lesson_translations" ADD COLUMN     "import_hash" TEXT,
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'IMPORT';

-- AlterTable
ALTER TABLE "project_brief_translations" ADD COLUMN     "import_hash" TEXT,
ADD COLUMN     "source" "ContentSource" NOT NULL DEFAULT 'IMPORT';

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "text_sources" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "content_drafts" (
    "entity_type" "ContentEntity" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "ContentDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "edited_by_id" UUID,
    "submitted_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("entity_type","entity_id","language_code")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" UUID NOT NULL,
    "entity_type" "ContentEntity" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "action" "ContentVersionAction" NOT NULL,
    "actor_id" UUID,
    "edited_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_drafts_status_updated_at_idx" ON "content_drafts"("status", "updated_at");

-- CreateIndex
CREATE INDEX "content_versions_entity_type_entity_id_language_code_create_idx" ON "content_versions"("entity_type", "entity_id", "language_code", "created_at");

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Hand-written: content_versions is the history of every live text, so its rows
-- are never changed or removed (a restore publishes a new version).
-- ─────────────────────────────────────────────────────────────
CREATE FUNCTION "prevent_content_version_changes"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'content_versions is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "content_versions_append_only"
  BEFORE UPDATE OR DELETE ON "content_versions"
  FOR EACH ROW EXECUTE FUNCTION "prevent_content_version_changes"();

-- The texts already live start the history (as imports).
INSERT INTO "content_versions" ("id", "entity_type", "entity_id", "language_code", "data", "action")
SELECT gen_random_uuid(), 'LESSON', "lesson_id", "language_code",
       jsonb_build_object('title', "title", 'summary', "summary", 'body', "body",
                          'videoProvider', "video_provider", 'videoId', "video_id"),
       'IMPORT'
FROM "lesson_translations";

INSERT INTO "content_versions" ("id", "entity_type", "entity_id", "language_code", "data", "action")
SELECT gen_random_uuid(), 'CHALLENGE', "challenge_id", "language_code",
       jsonb_build_object('title', "title", 'instructions', "instructions", 'hints', "hints",
                          'checkLabels', "check_labels"),
       'IMPORT'
FROM "challenge_translations";

INSERT INTO "content_versions" ("id", "entity_type", "entity_id", "language_code", "data", "action")
SELECT gen_random_uuid(), 'PROJECT', "brief_id", "language_code",
       jsonb_build_object('title', "title", 'summary', "summary", 'body', "body", 'hints', "hints",
                          'checkLabels', "check_labels"),
       'IMPORT'
FROM "project_brief_translations";

INSERT INTO "content_versions" ("id", "entity_type", "entity_id", "language_code", "data", "action")
SELECT gen_random_uuid(), 'QUIZ', q."id", t."key", t."value", 'IMPORT'
FROM "quizzes" q, jsonb_each(q."texts") t;
