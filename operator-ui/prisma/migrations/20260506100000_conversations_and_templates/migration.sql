-- Outreach templates (operators' reusable conversation playbooks)
CREATE TABLE IF NOT EXISTS "outreach_templates" (
    "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    "org_id"              UUID         NOT NULL,
    "name"                TEXT         NOT NULL,
    "channel"             TEXT         NOT NULL,
    "subject_template"    TEXT,
    "body_template"       TEXT         NOT NULL,
    "intent_filter"       TEXT,
    "status_filter"       TEXT,
    "version"             SMALLINT     NOT NULL DEFAULT 1,
    "base_confidence"     SMALLINT     NOT NULL DEFAULT 50,
    "created_by_user_id"  UUID,
    "archived_at"         TIMESTAMPTZ(6),
    "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "outreach_templates_filter_idx"
  ON "outreach_templates" ("org_id", "archived_at", "intent_filter", "status_filter");

-- Touches (single operator <-> intake interactions; the conversation log)
CREATE TABLE IF NOT EXISTS "touches" (
    "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    "org_id"              UUID         NOT NULL,
    "intake_id"           UUID         NOT NULL,
    "operator_user_id"    UUID,
    "channel"             TEXT         NOT NULL,
    "direction"           TEXT         NOT NULL,
    "subject"             TEXT,
    "body"                TEXT         NOT NULL,
    "template_id"         UUID,
    "context_summary"     TEXT,
    "outcome"             TEXT,
    "outcome_recorded_at" TIMESTAMPTZ(6),
    "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "touches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "touches_thread_idx"
  ON "touches" ("org_id", "intake_id", "created_at");
CREATE INDEX IF NOT EXISTS "touches_template_outcome_idx"
  ON "touches" ("template_id", "outcome");

ALTER TABLE "touches" ADD CONSTRAINT "touches_intake_id_fkey"
  FOREIGN KEY ("intake_id") REFERENCES "intakes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "touches" ADD CONSTRAINT "touches_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "outreach_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
