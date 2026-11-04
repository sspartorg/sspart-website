-- SSPART enquiry desk. Run once in the Supabase SQL editor, then:
--   1. Authentication > Sign In / Providers: turn off "Allow new users to sign up".
--   2. Authentication > Users: add the owner's email and password.
--   3. Run: insert into public.admins (user_id) select id from auth.users where email = 'YOUR_EMAIL';
-- Visitors never get an account. They can add an enquiry and do nothing else.

create extension if not exists pg_trgm with schema extensions;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  mobile text not null check (
    char_length(mobile) <= 24
    and mobile ~ '^\+?[0-9 ()-]+$'
    and char_length(regexp_replace(mobile, '\D', '', 'g')) between 7 and 15
  ),
  -- Digits only, so 09515093965, +91 95150 93965 and 95150-93965 all match one search
  mobile_digits text generated always as (regexp_replace(mobile, '\D', '', 'g')) stored,
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  company text check (company is null or char_length(company) <= 160),
  product text not null default 'Other' check (product in ('Atlas', 'Atlas Open', 'Atlas Enterprise', 'DheQuest', 'Synvord', 'Neel', 'Experts Jar', 'Custom software', 'Careers', 'Other')),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  source text check (source is null or char_length(source) <= 200),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost'))
);

create index enquiries_created_at_idx on public.enquiries (created_at desc);
create index enquiries_mobile_digits_idx on public.enquiries using gin (mobile_digits extensions.gin_trgm_ops);

create table public.enquiry_comments (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  author_email text not null default (auth.jwt() ->> 'email'),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index enquiry_comments_enquiry_idx on public.enquiry_comments (enquiry_id, created_at);

-- Every owner policy goes through this, so a stray signed-in account sees nothing
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- Reads the table without granting anon any access to it; the keepalive job calls this
create function public.ping() returns boolean
language sql stable security definer set search_path = ''
as $$ select count(*) >= 0 from public.enquiries $$;

create function public.touch_enquiry() returns trigger
language plpgsql
as $$ begin new.updated_at := now(); return new; end $$;

create trigger enquiries_touch before update on public.enquiries
for each row execute function public.touch_enquiry();

-- ponytail: stops one number repeating itself, not a bot rotating numbers; add Turnstile through an Edge Function if spam appears
create function public.limit_enquiries() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.enquiries
      where mobile_digits = regexp_replace(new.mobile, '\D', '', 'g')
        and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many enquiries from this number' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger enquiries_limit before insert on public.enquiries
for each row execute function public.limit_enquiries();

alter table public.admins enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_comments enable row level security;

-- Supabase grants everything to anon and authenticated by default; start from nothing
revoke all on public.admins, public.enquiries, public.enquiry_comments from anon, authenticated;
revoke all on function public.is_admin(), public.ping(), public.limit_enquiries(), public.touch_enquiry() from public, anon, authenticated;

-- Visitors: insert these columns only, so status and timestamps can't be set from outside
grant insert (name, mobile, email, company, product, message, source) on public.enquiries to anon;
create policy "visitors add enquiries" on public.enquiries for insert to anon with check (true);

-- Owner
grant select, delete on public.enquiries to authenticated;
grant update (status) on public.enquiries to authenticated;
grant select on public.enquiry_comments to authenticated;
grant insert (enquiry_id, body) on public.enquiry_comments to authenticated;
create policy "owner reads enquiries" on public.enquiries for select to authenticated using (public.is_admin());
create policy "owner updates enquiries" on public.enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "owner deletes enquiries" on public.enquiries for delete to authenticated using (public.is_admin());
create policy "owner reads comments" on public.enquiry_comments for select to authenticated using (public.is_admin());
create policy "owner adds comments" on public.enquiry_comments for insert to authenticated with check (public.is_admin());

grant execute on function public.is_admin() to authenticated;
grant execute on function public.ping() to anon;
