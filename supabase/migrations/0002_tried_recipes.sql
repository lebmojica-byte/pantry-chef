-- Recipes a user marked "Tried it": shown in the Tried list, never suggested again.
create table public.tried_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  recipe jsonb not null check (octet_length(recipe::text) <= 20000),
  tried_at timestamptz not null default now()
);
create unique index tried_recipes_unique on public.tried_recipes (user_id, lower(btrim(title)));
create index tried_recipes_user on public.tried_recipes (user_id, tried_at desc);

alter table public.tried_recipes enable row level security;
create policy "own tried recipes" on public.tried_recipes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.tried_recipes from anon, authenticated;
grant select, insert, delete on public.tried_recipes to authenticated;
