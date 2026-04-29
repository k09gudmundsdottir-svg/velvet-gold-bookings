REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_booked_appointment_slots(uuid, date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_booked_appointment_slots(uuid, date) FROM public;