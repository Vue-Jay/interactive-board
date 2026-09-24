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
