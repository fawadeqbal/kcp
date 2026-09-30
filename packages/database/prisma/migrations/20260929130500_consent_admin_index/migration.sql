-- Phase 1 Sprint 2: the admin panel lists consent records newest first.

-- CreateIndex
CREATE INDEX "consent_records_granted_at_idx" ON "consent_records"("granted_at");
