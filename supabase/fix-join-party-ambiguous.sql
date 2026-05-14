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

revoke all on function public.join_party_by_code(text, text) from public;
grant execute on function public.join_party_by_code(text, text) to anon, authenticated;
