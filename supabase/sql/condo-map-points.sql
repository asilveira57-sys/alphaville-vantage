-- Pontos do Mapa de Condomínios (protótipo /mapa-prototipo).
-- Um registro por condomínio que aparece como bolha. O nome casa com o nome usado no mapa.
-- Leitura pública (o mapa é público); escrita só admin (modo "ajustar posição" do mapa).
create table if not exists public.condo_map_points (
  condominium_id uuid primary key references public.condominiums(id) on delete cascade,
  name text not null,
  lat double precision,
  lng double precision,
  parent text,            -- complexo (ex.: 'Green Valley', 'Gramercy Park')
  region text,            -- Alphaville, Tamboré, Aldeia da Serra, Jaguari, Barueri…
  source text not null default 'manual', -- osm | rua | manual
  usage text,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.condo_map_points enable row level security;
drop policy if exists "map points public read" on public.condo_map_points;
create policy "map points public read" on public.condo_map_points for select to anon, authenticated using (true);
drop policy if exists "map points admin write" on public.condo_map_points;
create policy "map points admin write" on public.condo_map_points for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
grant select on public.condo_map_points to anon, authenticated;
grant insert, update, delete on public.condo_map_points to authenticated;
