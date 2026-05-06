-- Recommendation feedback + outcome columns
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "generator"            TEXT;
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "generator_version"    SMALLINT;
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "applied_by_user_id"   UUID;
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "applied_at"           TIMESTAMPTZ(6);
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "dismissed_by_user_id" UUID;
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "dismissed_at"         TIMESTAMPTZ(6);
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "dismissal_reason"     TEXT;
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "outcome"              TEXT;
ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "outcome_recorded_at"  TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "recommendations_generator_version_outcome_idx"
  ON "recommendations" ("generator", "generator_version", "outcome");

-- EngagementConfig - versioned thresholds for the engagement-state engine
CREATE TABLE IF NOT EXISTS "engagement_configs" (
    "id"                              UUID         NOT NULL DEFAULT gen_random_uuid(),
    "version"                         INT          NOT NULL,
    "active"                          BOOLEAN      NOT NULL DEFAULT FALSE,
    "active_days_threshold"           INT          NOT NULL,
    "at_risk_days_threshold"          INT          NOT NULL,
    "active_min_event_frequency_30d"  INT          NOT NULL,
    "description"                     TEXT,
    "created_at"                      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "engagement_configs_version_key"
  ON "engagement_configs" ("version");

-- Seed v1 of the engagement config matching the previous hardcoded constants
-- in src/lib/engagement-state.ts (14d active, 30d at_risk, 3 events/30d).
INSERT INTO "engagement_configs"
  ("version", "active", "active_days_threshold", "at_risk_days_threshold", "active_min_event_frequency_30d", "description")
VALUES
  (1, TRUE, 14, 30, 3, 'Initial config - matches v0 hardcoded thresholds')
ON CONFLICT ("version") DO NOTHING;
