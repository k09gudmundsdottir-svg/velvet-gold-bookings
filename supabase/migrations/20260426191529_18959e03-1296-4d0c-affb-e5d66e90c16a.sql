create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Men', 'Women', 'Kids', 'Treatments')),
  description text,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

create table public.stylists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  specialty text not null,
  bio text,
  years_experience integer not null default 0 check (years_experience >= 0),
  photo_url text,
  is_active boolean not null default true,
  availability jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stylists enable row level security;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

alter table public.customers enable row level security;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  service_id uuid references public.services(id) on delete set null,
  stylist_id uuid references public.stylists(id) on delete set null,
  appointment_start timestamptz not null,
  appointment_end timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show')),
  notes text,
  manage_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (appointment_end > appointment_start)
);

alter table public.appointments enable row level security;

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'replied', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create table public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  discount_code text not null default 'FIRST10',
  consent boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.newsletter_signups enable row level security;

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  image_url text not null,
  before_image_url text,
  after_image_url text,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.gallery_items enable row level security;

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  quote text not null,
  service_name text,
  is_featured boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_services_updated_at before update on public.services for each row execute function public.update_updated_at_column();
create trigger update_stylists_updated_at before update on public.stylists for each row execute function public.update_updated_at_column();
create trigger update_customers_updated_at before update on public.customers for each row execute function public.update_updated_at_column();
create trigger update_appointments_updated_at before update on public.appointments for each row execute function public.update_updated_at_column();
create trigger update_contact_messages_updated_at before update on public.contact_messages for each row execute function public.update_updated_at_column();

create policy "Public can view active services" on public.services for select using (is_active = true);
create policy "Admins can manage services" on public.services for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Public can view active stylists" on public.stylists for select using (is_active = true);
create policy "Admins can manage stylists" on public.stylists for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can view customers" on public.customers for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage customers" on public.customers for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Visitors can create appointments" on public.appointments for insert with check (true);
create policy "Admins can manage appointments" on public.appointments for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Visitors can send contact messages" on public.contact_messages for insert with check (true);
create policy "Admins can manage contact messages" on public.contact_messages for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Visitors can subscribe to newsletter" on public.newsletter_signups for insert with check (consent = true);
create policy "Admins can view newsletter signups" on public.newsletter_signups for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Public can view gallery items" on public.gallery_items for select using (true);
create policy "Admins can manage gallery items" on public.gallery_items for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Public can view featured testimonials" on public.testimonials for select using (is_featured = true);
create policy "Admins can manage testimonials" on public.testimonials for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can view roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create index idx_services_category on public.services(category, sort_order);
create index idx_stylists_active on public.stylists(is_active, sort_order);
create index idx_appointments_start on public.appointments(appointment_start);
create index idx_appointments_status on public.appointments(status);
create index idx_appointments_stylist_start on public.appointments(stylist_id, appointment_start);
create index idx_customers_email on public.customers(email);
create index idx_gallery_sort on public.gallery_items(sort_order);
create index idx_testimonials_featured on public.testimonials(is_featured, created_at desc);