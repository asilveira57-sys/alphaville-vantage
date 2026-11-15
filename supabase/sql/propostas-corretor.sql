-- Propostas do Corretor — tabelas, segurança e fotos.
-- Rodar UMA vez no editor SQL do Cloud do Lovable. Pode rodar de novo sem erro.
-- Leitura e escrita só para administradores (a página pública do cliente lê pelo servidor).

create table if not exists public.broker_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  photo_url text,
  creci text,
  whatsapp text,
  role_title text default 'Corretor',
  tagline text check (tagline is null or char_length(tagline) <= 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  broker_user_id uuid not null references public.broker_profiles(user_id),
  client_name text not null,
  client_phone text,
  message text check (message is null or char_length(message) <= 600),
  expires_at timestamptz not null default (now() + interval '14 days'),
  status text not null default 'enviada',
  view_count int not null default 0,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proposals_broker_idx on public.proposals(broker_user_id, created_at desc);

create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  property_id uuid not null references public.properties(id),
  position int not null default 0,
  broker_note text check (broker_note is null or char_length(broker_note) <= 140),
  price_sale_at_send numeric,
  price_rent_at_send numeric,
  unique (proposal_id, property_id)
);
create index if not exists proposal_items_proposal_idx on public.proposal_items(proposal_id, position);

-- No máximo 12 imóveis por proposta.
create or replace function public.proposal_items_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.proposal_items where proposal_id = new.proposal_id) >= 12 then
    raise exception 'Uma proposta pode ter no máximo 12 imóveis.';
  end if;
  return new;
end $$;
drop trigger if exists proposal_items_limit_trg on public.proposal_items;
create trigger proposal_items_limit_trg before insert on public.proposal_items
  for each row execute function public.proposal_items_limit();

alter table public.broker_profiles enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;

drop policy if exists "admin gerencia corretores" on public.broker_profiles;
create policy "admin gerencia corretores" on public.broker_profiles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin gerencia propostas" on public.proposals;
create policy "admin gerencia propostas" on public.proposals for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin gerencia itens de proposta" on public.proposal_items;
create policy "admin gerencia itens de proposta" on public.proposal_items for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Fotos dos corretores: bucket público para leitura; envio só por admin.
insert into storage.buckets (id, name, public)
values ('broker-photos', 'broker-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "admin envia foto de corretor" on storage.objects;
create policy "admin envia foto de corretor" on storage.objects for insert to authenticated
  with check (bucket_id = 'broker-photos' and public.has_role(auth.uid(), 'admin'));
drop policy if exists "admin troca foto de corretor" on storage.objects;
create policy "admin troca foto de corretor" on storage.objects for update to authenticated
  using (bucket_id = 'broker-photos' and public.has_role(auth.uid(), 'admin'));
drop policy if exists "admin apaga foto de corretor" on storage.objects;
create policy "admin apaga foto de corretor" on storage.objects for delete to authenticated
  using (bucket_id = 'broker-photos' and public.has_role(auth.uid(), 'admin'));

select 'ok' as resultado,
  (select count(*) from public.broker_profiles) as corretores,
  (select count(*) from public.proposals) as propostas;
