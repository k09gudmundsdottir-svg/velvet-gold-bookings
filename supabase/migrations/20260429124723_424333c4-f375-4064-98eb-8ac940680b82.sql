CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  insurance_type text NOT NULL DEFAULT 'Kasse',
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.medical_appointment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid,
  patient_name text NOT NULL,
  date_of_birth date NOT NULL,
  insurance_type text NOT NULL,
  reason text NOT NULL,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  admin_notes text,
  confirmed_start timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_appointment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitors can create appointment requests"
ON public.medical_appointment_requests FOR INSERT TO public
WITH CHECK (
  status = 'received'
  AND length(trim(patient_name)) BETWEEN 2 AND 120
  AND insurance_type IN ('Kasse', 'Privat')
  AND length(trim(reason)) BETWEEN 5 AND 1500
  AND preferred_date >= CURRENT_DATE
  AND length(trim(preferred_time)) BETWEEN 2 AND 40
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND length(trim(phone)) BETWEEN 6 AND 40
);

CREATE POLICY "Users can view own appointment requests"
ON public.medical_appointment_requests FOR SELECT TO authenticated
USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update appointment requests"
ON public.medical_appointment_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.medication_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid,
  patient_name text NOT NULL,
  date_of_birth date NOT NULL,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  last_prescription_date date,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'received',
  admin_notes text,
  ready_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medication_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitors can create medication requests"
ON public.medication_requests FOR INSERT TO public
WITH CHECK (
  status = 'received'
  AND length(trim(patient_name)) BETWEEN 2 AND 120
  AND length(trim(medication_name)) BETWEEN 2 AND 160
  AND length(trim(dosage)) BETWEEN 1 AND 120
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND ((phone IS NULL) OR length(trim(phone)) BETWEEN 6 AND 40)
);

CREATE POLICY "Users can view own medication requests"
ON public.medication_requests FOR SELECT TO authenticated
USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update medication requests"
ON public.medication_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.referral_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  file_url text,
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral letters"
ON public.referral_letters FOR SELECT TO authenticated
USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage referral letters"
ON public.referral_letters FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  published_at timestamptz,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published blog posts"
ON public.blog_posts FOR SELECT TO public
USING (is_published = true);

CREATE POLICY "Admins can manage blog posts"
ON public.blog_posts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.practice_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  notice_type text NOT NULL DEFAULT 'info',
  starts_on date,
  ends_on date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active notices"
ON public.practice_notices FOR SELECT TO public
USING (is_active = true);

CREATE POLICY "Admins can manage notices"
ON public.practice_notices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.weekend_duties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_date date NOT NULL UNIQUE,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '14:00',
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekend_duties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active weekend duties"
ON public.weekend_duties FOR SELECT TO public
USING (is_active = true);

CREATE POLICY "Admins can manage weekend duties"
ON public.weekend_duties FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_medical_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'medical_appointment_requests' AND NEW.status NOT IN ('received', 'confirmed', 'rejected', 'rescheduled') THEN
    RAISE EXCEPTION 'Invalid appointment request status';
  END IF;
  IF TG_TABLE_NAME = 'medication_requests' AND NEW.status NOT IN ('received', 'processing', 'ready', 'rejected') THEN
    RAISE EXCEPTION 'Invalid medication request status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_medical_appointment_status
BEFORE INSERT OR UPDATE ON public.medical_appointment_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_medical_status();

CREATE TRIGGER validate_medication_request_status
BEFORE INSERT OR UPDATE ON public.medication_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_medical_status();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medical_appointment_requests_updated_at BEFORE UPDATE ON public.medical_appointment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medication_requests_updated_at BEFORE UPDATE ON public.medication_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_practice_notices_updated_at BEFORE UPDATE ON public.practice_notices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekend_duties_updated_at BEFORE UPDATE ON public.weekend_duties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_medical_appointment_requests_patient ON public.medical_appointment_requests(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_medication_requests_patient ON public.medication_requests(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_practice_notices_active ON public.practice_notices(is_active, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_weekend_duties_date ON public.weekend_duties(duty_date);