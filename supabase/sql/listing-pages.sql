-- Páginas vivas de imóveis (/imoveis-alphaville/$slug). Rodado em 17/11/2026 pelo conector.
create table if not exists public.listing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  h1 text,
  meta_description text,
  intro_html text,
  filters jsonb not null default '{}'::jsonb,
  purpose text not null default 'sale' check (purpose in ('sale','rent')),
  min_items integer not null default 8,
  faq jsonb not null default '[]'::jsonb,
  related_slugs text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.listing_pages enable row level security;
create policy "Public read published listing pages" on public.listing_pages for select using (status = 'published');
create policy "Admins manage listing pages" on public.listing_pages for all using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
-- filters: { types?: string[], cities?: string[], bedrooms?: number, bedrooms_min?: number,
--   price_min?: number, price_max?: number, furnished?: boolean, condominium_ids?: uuid[] }
