-- One live grant per student and school licence (seats are counted from these).
CREATE UNIQUE INDEX "premium_grants_one_live_per_license"
  ON "premium_grants" ("user_id", "license_id")
  WHERE "revoked_at" IS NULL AND "license_id" IS NOT NULL;

-- One readiness check going on (or waiting for a mentor) per student.
CREATE UNIQUE INDEX "readiness_checks_one_open"
  ON "readiness_checks" ("student_id")
  WHERE "status" IN ('STARTED', 'SUBMITTED');
