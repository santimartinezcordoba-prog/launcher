-- Ejecutar una vez en el editor SQL del proyecto Supabase.
-- Cada cuenta solo puede leer o modificar su propio estado.
create table if not exists public.room_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.room_states enable row level security;
drop policy if exists "Usuarios leen su habitación" on public.room_states;
create policy "Usuarios leen su habitación" on public.room_states for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Usuarios crean su habitación" on public.room_states;
create policy "Usuarios crean su habitación" on public.room_states for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Usuarios guardan su habitación" on public.room_states;
create policy "Usuarios guardan su habitación" on public.room_states for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.room_states to authenticated;
