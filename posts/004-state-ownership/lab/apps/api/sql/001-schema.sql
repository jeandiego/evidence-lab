create table if not exists pets (
  id text primary key,
  name text not null,
  species text not null,
  coverage_kind text not null check (coverage_kind in ('PLAN', 'PARTNERSHIP', 'PRIVATE')),
  coverage_label text not null,
  service_price_cents integer not null check (service_price_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0 and discount_cents <= service_price_cents)
);

alter table pets add column if not exists discount_cents integer not null default 0;

create table if not exists lab_sessions (
  session_id text primary key,
  selected_pet_id text not null references pets(id),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
