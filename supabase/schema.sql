create extension if not exists pgcrypto;

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  host_guest_id text,
  member_count integer not null default 0 check (member_count >= 0),
  max_members integer not null default 8 check (max_members > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.party_members (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  guest_id text not null,
  joined_at timestamptz not null default now(),
  unique (party_id, guest_id)
);

insert into public.parties (code, name, member_count, max_members)
values
  ('BAB026', '금요일 저녁 파티', 0, 8),
  ('TEST01', '테스트 그룹', 0, 8)
on conflict (code) do nothing;

alter table public.parties enable row level security;
alter table public.party_members enable row level security;

create or replace function public.generate_party_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt integer := 0;
  position integer;
begin
  loop
    candidate := '';

    for position in 1..6 loop
      candidate := candidate || substr(
        alphabet,
        floor(random() * length(alphabet) + 1)::integer,
        1
      );
    end loop;

    exit when not exists (
      select 1
      from public.parties as parties
      where upper(parties.code) = candidate
    )
      and candidate ~ '^[A-Z0-9]{6}$'
      and candidate ~ '[A-Z]'
      and candidate ~ '[0-9]';

    attempt := attempt + 1;

    if attempt > 100 then
      raise exception 'code_generation_failed';
    end if;
  end loop;

  return candidate;
end;
$$;

create or replace function public.create_party(party_name text, host_guest_id text)
returns table (
  id uuid,
  code text,
  name text,
  member_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := trim(party_name);
  normalized_guest_id text := trim(host_guest_id);
  new_party public.parties%rowtype;
begin
  if normalized_name = '' then
    raise exception 'empty_name';
  end if;

  if normalized_guest_id = '' then
    raise exception 'empty_guest';
  end if;

  insert into public.parties (code, name, host_guest_id, member_count)
  values (public.generate_party_code(), normalized_name, normalized_guest_id, 1)
  returning * into new_party;

  insert into public.party_members (party_id, guest_id)
  values (new_party.id, normalized_guest_id);

  return query
  select
    new_party.id,
    new_party.code,
    new_party.name,
    new_party.member_count;
end;
$$;

create or replace function public.join_party_by_code(party_code text, guest_id text)
returns table (
  id uuid,
  code text,
  name text,
  member_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(party_code));
  normalized_guest_id text := trim(guest_id);
  current_party public.parties%rowtype;
  already_joined boolean := false;
begin
  if normalized_code = '' then
    raise exception 'empty_code';
  end if;

  if char_length(normalized_code) <> 6
    or normalized_code !~ '^[A-Z0-9]{6}$'
    or normalized_code !~ '[A-Z]'
    or normalized_code !~ '[0-9]'
  then
    raise exception 'invalid_code';
  end if;

  if normalized_guest_id = '' then
    raise exception 'empty_guest';
  end if;

  select *
  into current_party
  from public.parties as parties
  where upper(parties.code) = normalized_code
  for update;

  if not found then
    raise exception 'invalid_code';
  end if;

  select exists (
    select 1
    from public.party_members as members
    where members.party_id = current_party.id
      and members.guest_id = normalized_guest_id
  )
  into already_joined;

  if already_joined then
    return query
    select
      current_party.id,
      current_party.code,
      current_party.name,
      current_party.member_count;
    return;
  end if;

  if current_party.member_count >= current_party.max_members then
    raise exception 'party_full';
  end if;

  insert into public.party_members (party_id, guest_id)
  values (current_party.id, normalized_guest_id);

  update public.parties as parties
  set member_count = parties.member_count + 1
  where parties.id = current_party.id
  returning * into current_party;

  return query
  select
    current_party.id,
    current_party.code,
    current_party.name,
    current_party.member_count;
end;
$$;

revoke all on function public.generate_party_code() from public;
revoke all on function public.create_party(text, text) from public;
revoke all on function public.join_party_by_code(text, text) from public;

grant execute on function public.generate_party_code() to anon, authenticated;
grant execute on function public.create_party(text, text) to anon, authenticated;
grant execute on function public.join_party_by_code(text, text) to anon, authenticated;
