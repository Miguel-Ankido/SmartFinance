create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create table if not exists public.system_health_metrics (
  id bigint generated always as identity primary key,
  parser_name text not null,
  success_rate numeric(5, 2) not null check (success_rate between 0 and 100),
  blocked_security_events integer not null default 0 check (blocked_security_events >= 0),
  average_latency_ms integer not null default 0 check (average_latency_ms >= 0),
  recorded_at timestamptz not null default timezone('utc', now())
);

alter table public.system_health_metrics enable row level security;
drop policy if exists "health_metrics_admin_read" on public.system_health_metrics;
create policy "health_metrics_admin_read"
  on public.system_health_metrics for select
  to authenticated
  using (public.is_admin());

create table if not exists public.device_health_reports (
  id bigint generated always as identity primary key,
  sqlite_healthy boolean not null,
  pending_sync_transactions integer not null check (pending_sync_transactions >= 0),
  app_version text,
  recorded_at timestamptz not null default timezone('utc', now())
);

alter table public.device_health_reports enable row level security;
drop policy if exists "device_health_admin_read" on public.device_health_reports;
create policy "device_health_admin_read"
  on public.device_health_reports for select
  to authenticated
  using (public.is_admin());

create or replace function public.report_device_health(
  p_sqlite_healthy boolean,
  p_pending_sync_transactions integer,
  p_app_version text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_pending_sync_transactions < 0 then
    raise exception 'pending transaction count cannot be negative';
  end if;

  insert into public.device_health_reports (
    sqlite_healthy,
    pending_sync_transactions,
    app_version
  ) values (
    p_sqlite_healthy,
    p_pending_sync_transactions,
    nullif(left(p_app_version, 64), '')
  );
end;
$$;

create or replace function public.admin_system_overview()
returns table (
  total_users bigint,
  total_cloud_transactions bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'administrator role required';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.transactions where is_deleted = false);
end;
$$;

create or replace function public.admin_ping()
returns timestamptz
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'administrator role required';
  end if;

  return timezone('utc', now());
end;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.report_device_health(boolean, integer, text) from public;
revoke all on function public.admin_system_overview() from public;
revoke all on function public.admin_ping() from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.report_device_health(boolean, integer, text) to authenticated;
grant execute on function public.admin_system_overview() to authenticated;
grant execute on function public.admin_ping() to authenticated;

-- Promote trusted accounts only from the SQL editor or an approved backend:
-- update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
