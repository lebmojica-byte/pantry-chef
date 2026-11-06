-- Pantry Chef: pantry items, per-user recipe settings, daily AI quota.
-- Every table is owner-only via RLS (auth.uid()).

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  location text not null check (location in ('fridge', 'pantry', 'spice', 'herb')),
  created_at timestamptz not null default now()
);
create unique index pantry_items_unique on public.pantry_items (user_id, location, lower(btrim(name)));

alter table public.pantry_items enable row level security;
create policy "own items" on public.pantry_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  diet text not null default 'any' check (diet in ('any', 'vegetarian', 'vegan')),
  course text not null default 'any'
    check (course in ('any', 'breakfast', 'appetizer', 'soup', 'salad', 'main', 'dessert', 'snack')),
  servings int not null default 2 check (servings between 1 and 12),
  only_my_ingredients boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy "own settings" on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Daily AI request counter. No policies: only reachable through use_ai_quota().
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;

-- Atomically counts one AI request for the caller; true while under the limit.
create function public.use_ai_quota(daily_limit int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null then return false; end if;
  insert into public.ai_usage (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into n;
  return n <= daily_limit;
end $$;

revoke execute on function public.use_ai_quota(int) from public, anon;
grant execute on function public.use_ai_quota(int) to authenticated;

-- Explicit Data API access (project has "automatically expose new tables" off). anon gets nothing.
revoke all on public.pantry_items, public.user_settings, public.ai_usage from anon, authenticated;
grant select, insert, delete on public.pantry_items to authenticated;
grant select, insert, update on public.user_settings to authenticated;
