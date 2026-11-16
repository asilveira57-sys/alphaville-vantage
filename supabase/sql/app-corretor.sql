
-- App do Corretor: dono/etapa do lead, anotações, avisos no celular.
alter table public.leads add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.leads add column if not exists owner_at timestamptz;
alter table public.leads add column if not exists stage text not null default 'novo';
alter table public.leads add column if not exists pushed_at timestamptz;
create index if not exists leads_owner_idx on public.leads(owner_user_id, created_at desc);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead_idx on public.lead_notes(lead_id, created_at desc);
alter table public.lead_notes enable row level security;
drop policy if exists "admin le notas" on public.lead_notes;
create policy "admin le notas" on public.lead_notes for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
alter table public.push_subscriptions enable row level security;

create table if not exists public.app_private_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_private_settings enable row level security;
-- As chaves VAPID (key='vapid') são geradas pelo servidor no primeiro uso (src/lib/push.server.ts); nunca no repositório.

alter type public.app_role add value if not exists 'corretor'; -- rodar antes, sozinho
