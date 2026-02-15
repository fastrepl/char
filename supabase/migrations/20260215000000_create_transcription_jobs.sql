CREATE TABLE public.transcription_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  file_id text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_request_id text,
  raw_result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT transcription_jobs_user_id_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.transcription_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcription_jobs_select_owner"
  ON public.transcription_jobs AS PERMISSIVE
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "transcription_jobs_service_all"
  ON public.transcription_jobs AS PERMISSIVE
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX transcription_jobs_user_id_idx
  ON public.transcription_jobs (user_id);

CREATE INDEX transcription_jobs_status_pending_idx
  ON public.transcription_jobs (status, created_at)
  WHERE status NOT IN ('done', 'error');
