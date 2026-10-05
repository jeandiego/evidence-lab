truncate table lab_sessions;

insert into pets (id, name, species, coverage_kind, coverage_label, service_price_cents, discount_cents)
values
  ('luna', 'Luna', 'Gata', 'PLAN', 'Plano Pet Essencial', 0, 0),
  ('thor', 'Thor', 'Cachorro', 'PRIVATE', 'Particular', 14000, 2000),
  ('nina', 'Nina', 'Coelha', 'PARTNERSHIP', 'Parceria Clube Animal', 5000, 500)
on conflict (id) do update set
  name = excluded.name,
  species = excluded.species,
  coverage_kind = excluded.coverage_kind,
  coverage_label = excluded.coverage_label,
  service_price_cents = excluded.service_price_cents,
  discount_cents = excluded.discount_cents;
