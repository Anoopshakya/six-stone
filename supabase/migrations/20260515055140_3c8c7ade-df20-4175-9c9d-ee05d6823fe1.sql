ALTER TABLE public.registrations
  ALTER COLUMN investor_type DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS attendees_count integer NOT NULL DEFAULT 1 CHECK (attendees_count BETWEEN 1 AND 10);