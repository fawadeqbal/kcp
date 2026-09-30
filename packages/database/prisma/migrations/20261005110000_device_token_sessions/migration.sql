-- Push notifications follow the sign-in on the phone: a token belongs to a session.
-- AlterTable
ALTER TABLE "device_tokens" ADD COLUMN     "session_id" UUID;

-- CreateIndex
CREATE INDEX "device_tokens_session_id_idx" ON "device_tokens"("session_id");

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

