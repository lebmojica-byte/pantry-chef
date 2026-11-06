-- "My recipes": recipes a user saved to keep. Not suggested again as new ideas.
create table public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  recipe jsonb not null check (octet_length(recipe::text) <= 20000),
  saved_at timestamptz not null default now()
);
create unique index saved_recipes_unique on public.saved_recipes (user_id, lower(btrim(title)));
create index saved_recipes_user on public.saved_recipes (user_id, saved_at desc);

alter table public.saved_recipes enable row level security;
create policy "own saved recipes" on public.saved_recipes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.saved_recipes from anon, authenticated;
grant select, insert, delete on public.saved_recipes to authenticated;
