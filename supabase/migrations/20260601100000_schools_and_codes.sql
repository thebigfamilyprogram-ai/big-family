-- Ensure schools has expected columns
alter table schools
  add column if not exists code       text,
  add column if not exists city       text,
  add column if not exists logo_url   text,
  add column if not exists created_at timestamptz default now();

-- Coordinator codes table
create table if not exists coordinator_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  school_id  uuid references schools,
  used       boolean not null default false,
  used_by    uuid references auth.users,
  created_at timestamptz default now()
);

-- Expositor codes table
create table if not exists expositor_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  used       boolean not null default false,
  used_by    uuid references auth.users,
  created_at timestamptz default now()
);

-- Storage bucket for school logos
insert into storage.buckets (id, name, public)
values ('school-logos', 'school-logos', true)
on conflict (id) do nothing;
