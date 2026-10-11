-- Luck Journal: journal builder schema
--
-- A journal is made of pages (the tabs). Each page holds blocks (challenge list,
-- habit tracker, idea cards, notes, checklist, key facts, text). Blocks that
-- hold a list keep their rows in `items`. Habit check-ins live in `habit_logs`.
--
-- Run this in Supabase → SQL Editor, or let the Supabase GitHub integration
-- apply it. Every table uses row-level security, so each account can only read
-- and write its own rows.

-- ── Journal header ───────────────────────────────────────────────────────
create table if not exists public.journal_settings (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  eyebrow    text not null default '',
  title      text not null default 'My journal',
  subtitle   text not null default '',
  updated_at timestamptz not null default now()
);

-- ── Pages (tabs) ─────────────────────────────────────────────────────────
create table if not exists public.pages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  position   double precision not null default 0,
  title      text not null default 'Untitled',
  created_at timestamptz not null default now()
);
create index if not exists pages_user_idx on public.pages (user_id, position);

-- ── Blocks on a page ─────────────────────────────────────────────────────
create table if not exists public.blocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  page_id    uuid not null references public.pages on delete cascade,
  position   double precision not null default 0,
  type       text not null check (type in ('challenge', 'habits', 'ideas', 'notes', 'checklist', 'facts', 'text')),
  title      text not null default '',
  -- block settings and simple content, shape depends on `type`
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists blocks_user_idx on public.blocks (user_id);
create index if not exists blocks_page_idx on public.blocks (page_id, position);

-- ── List rows inside a block ─────────────────────────────────────────────
create table if not exists public.items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  block_id   uuid not null references public.blocks on delete cascade,
  position   double precision not null default 0,
  data       jsonb not null default '{}'::jsonb,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists items_user_idx on public.items (user_id);
create index if not exists items_block_idx on public.items (block_id, position);

-- ── Habit check-ins ──────────────────────────────────────────────────────
create table if not exists public.habit_logs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  item_id uuid not null references public.items on delete cascade,
  day     date not null,
  primary key (item_id, day)
);
create index if not exists habit_logs_user_idx on public.habit_logs (user_id);

-- ── Row-level security ───────────────────────────────────────────────────
alter table public.journal_settings enable row level security;
alter table public.pages            enable row level security;
alter table public.blocks           enable row level security;
alter table public.items            enable row level security;
alter table public.habit_logs       enable row level security;

drop policy if exists "own settings" on public.journal_settings;
create policy "own settings" on public.journal_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own pages" on public.pages;
create policy "own pages" on public.pages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own blocks" on public.blocks;
create policy "own blocks" on public.blocks
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  );

drop policy if exists "own items" on public.items;
create policy "own items" on public.items
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.blocks b where b.id = block_id and b.user_id = auth.uid())
  );

drop policy if exists "own habit logs" on public.habit_logs;
create policy "own habit logs" on public.habit_logs
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
  );
