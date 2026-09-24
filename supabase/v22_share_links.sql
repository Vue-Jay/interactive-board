-- InteractiveBoard v22: protected board share links
-- Run after v21. Safe to run repeatedly.

begin;

create table if not exists public.board_share_links (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('editor','viewer')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

alter table public.board_share_links enable row level security;

-- No direct table policies are needed. All operations go through the RPCs below,
-- so the raw token is never stored in the database.

create or replace function public.create_board_share_link(
  p_board_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_link public.board_share_links%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_role not in ('editor','viewer') then
    raise exception 'Некорректная роль';
  end if;
  if not public.is_board_owner(p_board_id) then
    raise exception 'Недостаточно прав';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.board_share_links(board_id, token_hash, role, created_by)
  values (
    p_board_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    p_role,
    auth.uid()
  )
  returning * into v_link;

  return jsonb_build_object(
    'id', v_link.id,
    'board_id', v_link.board_id,
    'role', v_link.role,
    'created_at', v_link.created_at,
    'expires_at', v_link.expires_at,
    'token', v_token
  );
end;
$$;

create or replace function public.list_board_share_links(p_board_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_board_owner(p_board_id) then
    raise exception 'Недостаточно прав';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'board_id', board_id,
      'role', role,
      'created_at', created_at,
      'expires_at', expires_at,
      'revoked_at', revoked_at
    ) order by created_at desc)
    from public.board_share_links
    where board_id = p_board_id and revoked_at is null
  ), '[]'::jsonb);
end;
$$;

create or replace function public.revoke_board_share_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select board_id into v_board_id
  from public.board_share_links
  where id = p_link_id;

  if v_board_id is null or not public.is_board_owner(v_board_id) then
    raise exception 'Недостаточно прав';
  end if;

  update public.board_share_links
  set revoked_at = now()
  where id = p_link_id and revoked_at is null;
end;
$$;

create or replace function public.redeem_board_share_link(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_link public.board_share_links%rowtype;
  v_board public.boards%rowtype;
  v_existing_role text;
  v_effective_role text;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_token is null or length(trim(p_token)) < 32 then
    raise exception 'Некорректная ссылка';
  end if;

  select * into v_link
  from public.board_share_links
  where token_hash = encode(digest(trim(p_token), 'sha256'), 'hex')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    raise exception 'Ссылка недействительна или отозвана';
  end if;

  select * into v_board from public.boards where id = v_link.board_id;
  if not found then
    raise exception 'Доска не найдена';
  end if;

  if v_board.owner_id = v_user then
    v_effective_role := 'owner';
  else
    select role into v_existing_role
    from public.board_members
    where board_id = v_link.board_id and user_id = v_user;

    v_effective_role := case
      when v_existing_role = 'editor' or v_link.role = 'editor' then 'editor'
      else 'viewer'
    end;

    insert into public.board_members(board_id, user_id, role)
    values(v_link.board_id, v_user, v_effective_role)
    on conflict(board_id,user_id) do update
      set role = case
        when public.board_members.role = 'editor' or excluded.role = 'editor' then 'editor'
        else 'viewer'
      end;
  end if;

  return jsonb_build_object(
    'id', v_board.id,
    'title', v_board.title,
    'owner_id', v_board.owner_id,
    'role', v_effective_role,
    'created_at', v_board.created_at,
    'updated_at', v_board.updated_at
  );
end;
$$;

revoke all on function public.create_board_share_link(uuid,text) from public, anon;
revoke all on function public.list_board_share_links(uuid) from public, anon;
revoke all on function public.revoke_board_share_link(uuid) from public, anon;
revoke all on function public.redeem_board_share_link(text) from public, anon;

grant execute on function public.create_board_share_link(uuid,text) to authenticated;
grant execute on function public.list_board_share_links(uuid) to authenticated;
grant execute on function public.revoke_board_share_link(uuid) to authenticated;
grant execute on function public.redeem_board_share_link(text) to authenticated;

commit;
