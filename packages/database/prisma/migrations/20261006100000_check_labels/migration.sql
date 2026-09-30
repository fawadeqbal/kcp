-- What each check looks at, in a few words, shown as a checklist beside the editor.
ALTER TABLE "challenge_translations" ADD COLUMN "check_labels" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "project_brief_translations" ADD COLUMN "check_labels" JSONB NOT NULL DEFAULT '{}';
