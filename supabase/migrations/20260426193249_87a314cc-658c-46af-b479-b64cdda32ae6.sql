CREATE OR REPLACE FUNCTION public.get_booked_appointment_slots(_stylist_id uuid, _day date)
RETURNS TABLE (appointment_start timestamp with time zone, appointment_end timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.appointment_start, a.appointment_end
  FROM public.appointments a
  WHERE a.stylist_id = _stylist_id
    AND a.status IN ('pending', 'confirmed')
    AND a.appointment_start >= _day::timestamp with time zone
    AND a.appointment_start < ((_day + 1)::timestamp with time zone)
  ORDER BY a.appointment_start;
$$;

CREATE OR REPLACE FUNCTION public.prevent_overlapping_appointments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stylist_id IS NOT NULL AND NEW.status IN ('pending', 'confirmed') THEN
    IF EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.id <> NEW.id
        AND a.stylist_id = NEW.stylist_id
        AND a.status IN ('pending', 'confirmed')
        AND tstzrange(a.appointment_start, a.appointment_end, '[)') && tstzrange(NEW.appointment_start, NEW.appointment_end, '[)')
    ) THEN
      RAISE EXCEPTION 'Selected stylist is no longer available at this time.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_appointment_overlap ON public.appointments;
CREATE TRIGGER prevent_appointment_overlap
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_overlapping_appointments();