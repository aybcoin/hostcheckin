/*
  # Add configurable onboarding steps per host

  This table stores a short, user-linked checklist (3-5 items) with
  customizable labels and ordering. The application computes completion from
  business signals and writes `completed_at` when a step is achieved.
*/

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  icon_name text NOT NULL DEFAULT 'circle',
  title text NOT NULL,
  description text NOT NULL,
  estimate_label text NOT NULL DEFAULT '~1 min',
  position smallint NOT NULL DEFAULT 0,
  cta_label text,
  cta_page text,
  cta_external_url text,
  depends_on_step_key text,
  is_enabled boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_steps_host_step_key_unique UNIQUE (host_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_steps_host_position
  ON onboarding_steps(host_id, position);

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view own onboarding steps" ON onboarding_steps;
DROP POLICY IF EXISTS "Hosts can insert own onboarding steps" ON onboarding_steps;
DROP POLICY IF EXISTS "Hosts can update own onboarding steps" ON onboarding_steps;
DROP POLICY IF EXISTS "Hosts can delete own onboarding steps" ON onboarding_steps;

CREATE POLICY "Hosts can view own onboarding steps"
  ON onboarding_steps FOR SELECT
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can insert own onboarding steps"
  ON onboarding_steps FOR INSERT
  TO authenticated
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can update own onboarding steps"
  ON onboarding_steps FOR UPDATE
  TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can delete own onboarding steps"
  ON onboarding_steps FOR DELETE
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

WITH default_steps AS (
  SELECT
    h.id AS host_id,
    s.step_key,
    s.icon_name,
    s.title,
    s.description,
    s.estimate_label,
    s.position,
    s.cta_label,
    s.cta_page,
    s.depends_on_step_key,
    s.completed_at
  FROM hosts h
  CROSS JOIN (
    VALUES
      (
        'account_created',
        'shield-check',
        'Compte créé',
        'Votre espace HostCheckIn est prêt.',
        '~1 min',
        1::smallint,
        NULL,
        NULL,
        NULL,
        now()
      ),
      (
        'connect_property',
        'home',
        'Connecter Airbnb ou ajouter un logement',
        'Importez Airbnb ou ajoutez votre premier logement.',
        '~1 min',
        2::smallint,
        'Ajouter un logement',
        'properties',
        'account_created',
        NULL
      ),
      (
        'customize_contract',
        'file-text',
        'Personnaliser mon contrat',
        'Adaptez votre modèle contractuel en quelques clics.',
        '~2 min',
        3::smallint,
        'Configurer mon contrat',
        'contracts',
        'connect_property',
        NULL
      ),
      (
        'enable_auto_checkin',
        'qr-code',
        'Activer le check-in automatique',
        'Générez votre lien permanent et partagez-le avec vos voyageurs.',
        '~1 min',
        4::smallint,
        'Activer maintenant',
        'properties',
        'customize_contract',
        NULL
      )
  ) AS s(
    step_key,
    icon_name,
    title,
    description,
    estimate_label,
    position,
    cta_label,
    cta_page,
    depends_on_step_key,
    completed_at
  )
)
INSERT INTO onboarding_steps (
  host_id,
  step_key,
  icon_name,
  title,
  description,
  estimate_label,
  position,
  cta_label,
  cta_page,
  depends_on_step_key,
  completed_at
)
SELECT
  host_id,
  step_key,
  icon_name,
  title,
  description,
  estimate_label,
  position,
  cta_label,
  cta_page,
  depends_on_step_key,
  completed_at
FROM default_steps
ON CONFLICT (host_id, step_key) DO NOTHING;
