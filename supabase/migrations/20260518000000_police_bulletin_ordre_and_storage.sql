CREATE OR REPLACE FUNCTION public.next_police_bulletin_ordre(p_host_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  current_counter integer;
  next_counter integer;
BEGIN
  SELECT police_bulletin_counter
  INTO current_counter
  FROM public.hosts
  WHERE id = p_host_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'host_not_found: %', p_host_id;
  END IF;

  next_counter := COALESCE(current_counter, 0) + 1;

  UPDATE public.hosts
  SET police_bulletin_counter = next_counter
  WHERE id = p_host_id;

  RETURN next_counter;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_police_bulletin_ordre()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ordre_no IS NULL THEN
    NEW.ordre_no := public.next_police_bulletin_ordre(NEW.host_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS police_bulletins_assign_ordre_no ON public.police_bulletins;
CREATE TRIGGER police_bulletins_assign_ordre_no
BEFORE INSERT ON public.police_bulletins
FOR EACH ROW
EXECUTE FUNCTION public.assign_police_bulletin_ordre();

INSERT INTO storage.buckets (id, name, public)
VALUES ('police-bulletins', 'police-bulletins', false)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Hosts can view own police bulletin PDFs" ON storage.objects;
CREATE POLICY "Hosts can view own police bulletin PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'police-bulletins'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Hosts can upload own police bulletin PDFs" ON storage.objects;
CREATE POLICY "Hosts can upload own police bulletin PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'police-bulletins'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Hosts can update own police bulletin PDFs" ON storage.objects;
CREATE POLICY "Hosts can update own police bulletin PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'police-bulletins'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'police-bulletins'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Hosts can delete own police bulletin PDFs" ON storage.objects;
CREATE POLICY "Hosts can delete own police bulletin PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'police-bulletins'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
