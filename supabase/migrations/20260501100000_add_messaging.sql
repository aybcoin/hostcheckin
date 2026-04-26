-- HostCheckIn — Phase 2 Lot G — Smart Messaging templates
-- Adds host-scoped message templates with locale/channel defaults.

-- =========================================================================
-- TABLE
-- =========================================================================

CREATE TABLE IF NOT EXISTS message_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id    uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  trigger    text NOT NULL
               CHECK (
                 trigger IN (
                   'checkin_reminder_j1',
                   'checkin_day',
                   'checkout_reminder',
                   'contract_signed',
                   'verification_complete'
                 )
               ),
  channel    text NOT NULL
               CHECK (channel IN ('email', 'sms')),
  locale     text NOT NULL
               CHECK (locale IN ('fr', 'en', 'ar', 'darija')),
  subject    text,
  body       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT message_templates_email_subject_check
    CHECK (
      channel <> 'email'
      OR subject IS NOT NULL
      AND btrim(subject) <> ''
    )
);

CREATE INDEX IF NOT EXISTS idx_message_templates_host_id
  ON message_templates(host_id);

CREATE INDEX IF NOT EXISTS idx_message_templates_trigger
  ON message_templates(trigger);

CREATE INDEX IF NOT EXISTS idx_message_templates_locale
  ON message_templates(locale);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_templates_default_per_combo
  ON message_templates(host_id, trigger, channel, locale)
  WHERE is_default = true;

-- =========================================================================
-- updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION set_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_message_templates_updated_at ON message_templates;
CREATE TRIGGER trg_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION set_message_templates_updated_at();

-- =========================================================================
-- RPC helper for transactional default switching
-- =========================================================================

CREATE OR REPLACE FUNCTION set_message_template_default(
  p_template_id uuid,
  p_host_id uuid
)
RETURNS void AS $$
DECLARE
  v_trigger text;
  v_channel text;
  v_locale text;
BEGIN
  SELECT trigger, channel, locale
  INTO v_trigger, v_channel, v_locale
  FROM message_templates
  WHERE id = p_template_id
    AND host_id = p_host_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_template_not_found';
  END IF;

  UPDATE message_templates
  SET is_default = false
  WHERE host_id = p_host_id
    AND trigger = v_trigger
    AND channel = v_channel
    AND locale = v_locale;

  UPDATE message_templates
  SET is_default = true,
      is_active = true
  WHERE id = p_template_id
    AND host_id = p_host_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- RLS — message_templates
-- =========================================================================

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own message templates" ON message_templates;
CREATE POLICY "Hosts can read own message templates" ON message_templates
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own message templates" ON message_templates;
CREATE POLICY "Hosts can insert own message templates" ON message_templates
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own message templates" ON message_templates;
CREATE POLICY "Hosts can update own message templates" ON message_templates
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own message templates" ON message_templates;
CREATE POLICY "Hosts can delete own message templates" ON message_templates
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);

-- =========================================================================
-- ALTER guests
-- =========================================================================

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS preferred_locale text
    CHECK (preferred_locale IN ('fr', 'en', 'ar', 'darija') OR preferred_locale IS NULL);
