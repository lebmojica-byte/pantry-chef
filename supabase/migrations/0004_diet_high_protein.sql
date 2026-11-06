-- Diet option "High protein".
alter table public.user_settings drop constraint user_settings_diet_check;
alter table public.user_settings add constraint user_settings_diet_check
  check (diet in ('any', 'vegetarian', 'vegan', 'high_protein'));
