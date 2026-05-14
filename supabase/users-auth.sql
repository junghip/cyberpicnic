create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint app_users_nickname_unique unique (nickname)
);

alter table public.app_users enable row level security;

create or replace function public.register_user(p_nickname text, p_password text)
returns table (
  user_id uuid,
  nickname text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_nickname text := trim(p_nickname);
  normalized_password text := trim(p_password);
begin
  if normalized_nickname = '' then
    raise exception 'empty_nickname';
  end if;

  if char_length(normalized_password) < 4 then
    raise exception 'weak_password';
  end if;

  if exists (
    select 1
    from public.app_users as users
    where lower(users.nickname) = lower(normalized_nickname)
  ) then
    raise exception 'nickname_taken';
  end if;

  return query
  insert into public.app_users (nickname, password_hash)
  values (normalized_nickname, crypt(normalized_password, gen_salt('bf')))
  returning id, app_users.nickname;
end;
$$;

create or replace function public.login_user(p_nickname text, p_password text)
returns table (
  user_id uuid,
  nickname text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_nickname text := trim(p_nickname);
  normalized_password text := trim(p_password);
  matched_user public.app_users%rowtype;
begin
  if normalized_nickname = '' or normalized_password = '' then
    raise exception 'invalid_credentials';
  end if;

  select *
  into matched_user
  from public.app_users as users
  where lower(users.nickname) = lower(normalized_nickname)
    and users.password_hash = crypt(normalized_password, users.password_hash);

  if not found then
    raise exception 'invalid_credentials';
  end if;

  return query
  select matched_user.id, matched_user.nickname;
end;
$$;

revoke all on function public.register_user(text, text) from public;
revoke all on function public.login_user(text, text) from public;

grant execute on function public.register_user(text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;
