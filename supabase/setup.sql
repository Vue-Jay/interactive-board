-- Interactive Board v21 backend for Supabase
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Пользователь',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Новая доска',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','viewer')),
  added_at timestamptz not null default now(),
  primary key (board_id,user_id)
);

create table if not exists public.board_invites (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  unique(board_id,email)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name,email)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(coalesce(new.email,''),'@',1),'Пользователь'),coalesce(new.email,''))
  on conflict(id) do update set display_name=excluded.display_name,email=excluded.email;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email,raw_user_meta_data on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles(id,display_name,email,created_at)
select id,coalesce(nullif(raw_user_meta_data->>'display_name',''),split_part(coalesce(email,''),'@',1),'Пользователь'),coalesce(email,''),created_at
from auth.users
on conflict(id) do update set display_name=excluded.display_name,email=excluded.email;

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_invites enable row level security;

-- Security-definer helpers avoid recursive RLS checks between boards and board_members.
create or replace function public.is_board_owner(p_board_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.boards b where b.id=p_board_id and b.owner_id=auth.uid());
$$;
create or replace function public.can_access_board(p_board_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.boards b where b.id=p_board_id and b.owner_id=auth.uid())
      or exists(select 1 from public.board_members m where m.board_id=p_board_id and m.user_id=auth.uid());
$$;
create or replace function public.can_edit_board(p_board_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.boards b where b.id=p_board_id and b.owner_id=auth.uid())
      or exists(select 1 from public.board_members m where m.board_id=p_board_id and m.user_id=auth.uid() and m.role='editor');
$$;
grant execute on function public.is_board_owner(uuid) to authenticated;
grant execute on function public.can_access_board(uuid) to authenticated;
grant execute on function public.can_edit_board(uuid) to authenticated;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using (id=auth.uid());

drop policy if exists boards_select_access on public.boards;
create policy boards_select_access on public.boards for select to authenticated using (public.can_access_board(id));
drop policy if exists boards_insert_owner on public.boards;
create policy boards_insert_owner on public.boards for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists boards_update_edit on public.boards;
create policy boards_update_edit on public.boards for update to authenticated using (public.can_edit_board(id)) with check (public.can_edit_board(id));
drop policy if exists boards_delete_owner on public.boards;
create policy boards_delete_owner on public.boards for delete to authenticated using(public.is_board_owner(id));

drop policy if exists members_select_access on public.board_members;
create policy members_select_access on public.board_members for select to authenticated using (user_id=auth.uid() or public.is_board_owner(board_id));
drop policy if exists members_owner_insert on public.board_members;
create policy members_owner_insert on public.board_members for insert to authenticated with check (public.is_board_owner(board_id));
drop policy if exists members_owner_update on public.board_members;
create policy members_owner_update on public.board_members for update to authenticated using (public.is_board_owner(board_id)) with check (public.is_board_owner(board_id));
drop policy if exists members_owner_delete on public.board_members;
create policy members_owner_delete on public.board_members for delete to authenticated using (public.is_board_owner(board_id));

drop policy if exists invites_owner_all on public.board_invites;
create policy invites_owner_all on public.board_invites for all to authenticated using (public.is_board_owner(board_id)) with check (public.is_board_owner(board_id));

create or replace function public.claim_my_board_invites()
returns void language plpgsql security definer set search_path=public as $$
declare v_email text;
begin
  select lower(email) into v_email from auth.users where id=auth.uid();
  if v_email is null then return; end if;
  insert into public.board_members(board_id,user_id,role)
  select i.board_id,auth.uid(),i.role from public.board_invites i where lower(i.email)=v_email
  on conflict(board_id,user_id) do update set role=excluded.role;
  delete from public.board_invites where lower(email)=v_email;
end; $$;
grant execute on function public.claim_my_board_invites() to authenticated;

create or replace function public.invite_board_member(p_board_id uuid,p_email text,p_role text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid; v_email text:=lower(trim(p_email));
begin
  if p_role not in ('editor','viewer') then raise exception 'Некорректная роль'; end if;
  if not exists(select 1 from public.boards where id=p_board_id and owner_id=auth.uid()) then raise exception 'Недостаточно прав'; end if;
  select id into v_user from auth.users where lower(email)=v_email limit 1;
  if v_user=auth.uid() then raise exception 'Вы уже владелец этой доски'; end if;
  if v_user is not null then
    insert into public.board_members(board_id,user_id,role) values(p_board_id,v_user,p_role)
    on conflict(board_id,user_id) do update set role=excluded.role;
    delete from public.board_invites where board_id=p_board_id and lower(email)=v_email;
    return jsonb_build_object('kind','member');
  end if;
  insert into public.board_invites(board_id,email,role) values(p_board_id,v_email,p_role)
  on conflict(board_id,email) do update set role=excluded.role;
  return jsonb_build_object('kind','invite');
end; $$;
grant execute on function public.invite_board_member(uuid,text,text) to authenticated;

create or replace function public.get_board_access(p_board_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.boards where id=p_board_id and owner_id=auth.uid()) then raise exception 'Недостаточно прав'; end if;
  return jsonb_build_object(
    'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'added_at',m.added_at,'name',p.display_name,'email',p.email,'created_at',p.created_at) order by m.added_at) from public.board_members m left join public.profiles p on p.id=m.user_id where m.board_id=p_board_id),'[]'::jsonb),
    'invites',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'created_at',i.created_at) order by i.created_at) from public.board_invites i where i.board_id=p_board_id),'[]'::jsonb)
  );
end; $$;
grant execute on function public.get_board_access(uuid) to authenticated;
-- Interactive Board v19: server-side board document storage
-- Run this after v18 setup.sql if v18 is already installed.

create table if not exists public.board_documents (
  board_id uuid primary key references public.boards(id) on delete cascade,
  document jsonb not null default '{"version":1,"title":"Новая доска","view":{"x":0,"y":0,"zoom":1},"items":[]}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.board_documents enable row level security;

drop policy if exists board_documents_select_access on public.board_documents;
create policy board_documents_select_access on public.board_documents
for select to authenticated
using (public.can_access_board(board_id));

drop policy if exists board_documents_insert_edit on public.board_documents;
create policy board_documents_insert_edit on public.board_documents
for insert to authenticated
with check (public.can_edit_board(board_id));

drop policy if exists board_documents_update_edit on public.board_documents;
create policy board_documents_update_edit on public.board_documents
for update to authenticated
using (public.can_edit_board(board_id))
with check (public.can_edit_board(board_id));

create or replace function public.save_board_document(
  p_board_id uuid,
  p_document jsonb,
  p_expected_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_current_version bigint;
  v_current_document jsonb;
  v_next_version bigint;
begin
  if not public.can_edit_board(p_board_id) then
    raise exception 'Недостаточно прав для редактирования доски';
  end if;

  -- Serialize saves per board so two devices cannot silently overwrite each other.
  perform pg_advisory_xact_lock(hashtextextended(p_board_id::text, 0));

  select version, document
    into v_current_version, v_current_document
  from public.board_documents
  where board_id = p_board_id;

  if not found then
    insert into public.board_documents(board_id, document, version, updated_at, updated_by)
    values(p_board_id, p_document, 1, now(), auth.uid());

    update public.boards set updated_at=now() where id=p_board_id;

    return jsonb_build_object(
      'ok', true,
      'conflict', false,
      'version', 1,
      'updated_at', now()
    );
  end if;

  if p_expected_version is not null and p_expected_version <> v_current_version then
    return jsonb_build_object(
      'ok', false,
      'conflict', true,
      'version', v_current_version,
      'document', v_current_document
    );
  end if;

  v_next_version := v_current_version + 1;

  update public.board_documents
  set document=p_document,
      version=v_next_version,
      updated_at=now(),
      updated_by=auth.uid()
  where board_id=p_board_id;

  update public.boards set updated_at=now() where id=p_board_id;

  return jsonb_build_object(
    'ok', true,
    'conflict', false,
    'version', v_next_version,
    'updated_at', now()
  );
end;
$$;

grant execute on function public.save_board_document(uuid,jsonb,bigint) to authenticated;

-- InteractiveBoard v20. Run after v19, or use the complete setup.sql.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-assets', 'board-assets', false, 52428800, array['image/*', 'application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Invalid paths return NULL rather than failing a UUID cast inside RLS.
create or replace function public.board_asset_board_id(object_name text)
returns uuid language sql immutable set search_path = public as $$
  select case when object_name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[a-zA-Z0-9_-]+$'
    then split_part(object_name, '/', 1)::uuid else null end;
$$;

drop policy if exists board_assets_read on storage.objects;
create policy board_assets_read on storage.objects for select to authenticated
using (bucket_id = 'board-assets' and public.can_access_board(public.board_asset_board_id(name)));

drop policy if exists board_assets_insert on storage.objects;
create policy board_assets_insert on storage.objects for insert to authenticated
with check (bucket_id = 'board-assets' and public.can_edit_board(public.board_asset_board_id(name)));

drop policy if exists board_assets_update on storage.objects;
create policy board_assets_update on storage.objects for update to authenticated
using (bucket_id = 'board-assets' and public.can_edit_board(public.board_asset_board_id(name)))
with check (bucket_id = 'board-assets' and public.can_edit_board(public.board_asset_board_id(name)));

drop policy if exists board_assets_delete on storage.objects;
create policy board_assets_delete on storage.objects for delete to authenticated
using (bucket_id = 'board-assets' and public.can_edit_board(public.board_asset_board_id(name)));

commit;

-- InteractiveBoard v21: publish board documents; existing SELECT RLS still applies.
-- Run after v20. Safe to run repeatedly.
begin;
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'board_documents'
  ) then
    alter publication supabase_realtime add table public.board_documents;
  end if;
end;
$$;
commit;

-- Owner identity comes exclusively from the authenticated JWT, never RPC input.
begin;

create or replace function public.create_board(p_title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_board public.boards%rowtype;
begin
  if v_owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.boards (title, owner_id)
  values (coalesce(nullif(btrim(p_title), ''), 'Новая доска'), v_owner)
  returning * into v_board;

  return to_jsonb(v_board);
end;
$$;

revoke all on function public.create_board(text) from public, anon;
grant execute on function public.create_board(text) to authenticated;

commit;
