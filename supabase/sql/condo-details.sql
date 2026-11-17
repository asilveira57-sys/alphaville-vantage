-- Ficha completa da página de condomínio (modelo: Bellagio, 17/11/2026).
alter table public.condominiums
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists developer text,          -- construtora / incorporadora
  add column if not exists towers integer,
  add column if not exists floors integer,
  add column if not exists official_name text,      -- nome comercial (ex.: Bellagio Ecopark Alphaville)
  add column if not exists gallery jsonb not null default '[]'::jsonb,  -- [{url, alt}]
  add column if not exists nearby jsonb not null default '[]'::jsonb,   -- [{cat, name, km, min}]
  add column if not exists faq jsonb not null default '[]'::jsonb,      -- [{question, answer}]
  add column if not exists details_sources text;    -- de onde vieram os dados (conferência)
