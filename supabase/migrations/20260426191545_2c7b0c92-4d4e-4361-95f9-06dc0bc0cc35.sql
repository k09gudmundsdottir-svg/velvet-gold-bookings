drop policy if exists "Visitors can create appointments" on public.appointments;
drop policy if exists "Visitors can send contact messages" on public.contact_messages;

create policy "Visitors can create valid appointments"
on public.appointments
for insert
with check (
  status = 'pending'
  and length(trim(customer_name)) between 2 and 120
  and customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  and (customer_phone is null or length(trim(customer_phone)) between 6 and 40)
  and appointment_start > now()
  and appointment_end > appointment_start
);

create policy "Visitors can send valid contact messages"
on public.contact_messages
for insert
with check (
  status = 'new'
  and length(trim(name)) between 2 and 120
  and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  and length(trim(message)) between 10 and 2000
  and (phone is null or length(trim(phone)) between 6 and 40)
);