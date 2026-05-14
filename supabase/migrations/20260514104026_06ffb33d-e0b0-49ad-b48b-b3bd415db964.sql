
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Event settings (single row)
CREATE TABLE public.event_settings (
  id INT PRIMARY KEY DEFAULT 1,
  event_name TEXT NOT NULL DEFAULT 'Apex Investor Summit 2026',
  event_tagline TEXT NOT NULL DEFAULT 'An exclusive, invitation-only gathering for global capital allocators.',
  event_date TEXT NOT NULL DEFAULT 'March 12, 2026',
  event_time TEXT NOT NULL DEFAULT '6:00 PM onwards',
  venue TEXT NOT NULL DEFAULT 'The Grand Ballroom, Taj Palace, Mumbai',
  seat_cap INT NOT NULL DEFAULT 150,
  organizer TEXT NOT NULL DEFAULT 'Apex Capital Partners',
  contact_email TEXT NOT NULL DEFAULT 'rsvp@apexcapital.example',
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.event_settings (id) VALUES (1);

ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event settings"
  ON public.event_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update event settings"
  ON public.event_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Registrations
CREATE TYPE public.registration_status AS ENUM ('registered', 'attended');

CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  company TEXT NOT NULL,
  designation TEXT NOT NULL,
  investor_type TEXT NOT NULL,
  linkedin_url TEXT,
  status public.registration_status NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attended_at TIMESTAMPTZ
);

CREATE INDEX ON public.registrations (status);
CREATE INDEX ON public.registrations (registered_at DESC);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- No public SELECT/INSERT/UPDATE policies — all writes/reads go through server functions using the admin (service role) client.
CREATE POLICY "Admins can view all registrations"
  ON public.registrations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update registrations"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
