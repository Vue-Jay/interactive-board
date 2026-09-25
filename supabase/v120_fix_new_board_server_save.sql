-- OnlineRepetitor v120
-- Fix server saving for a newly created board whose board_documents row does not exist yet.
-- v89 accidentally checked PL/pgSQL FOUND after reading the profile, so a normal profile row
-- could make the function think the board document already existed.
begin;

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
  v_delta jsonb;
  v_name text;
  v_document_found boolean := false;
begin
  if not public.can_edit_board(p_board_id) then
    raise exception 'Недостаточно прав для редактирования доски';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_board_id::text,0));

  select version, document
    into v_current_version, v_current_document
  from public.board_documents
  where board_id=p_board_id;

  -- IMPORTANT: capture FOUND immediately. Any later SELECT changes FOUND.
  v_document_found := found;

  select nullif(trim(display_name),'')
    into v_name
  from public.profiles
  where id=auth.uid();
  v_name := coalesce(v_name,'Участник');

  if not v_document_found then
    v_delta := public.board_item_delta('{"items":[]}'::jsonb,p_document);

    insert into public.board_documents(board_id,document,version,updated_at,updated_by)
    values(p_board_id,p_document,1,now(),auth.uid());

    insert into public.board_document_history(board_id,version,document,saved_at,saved_by)
    values(p_board_id,1,p_document,now(),auth.uid())
    on conflict do nothing;

    insert into public.board_activity(
      board_id,version,actor_id,actor_name,
      added_count,changed_count,removed_count,item_count
    )
    values(
      p_board_id,1,auth.uid(),v_name,
      (v_delta->>'added')::int,
      (v_delta->>'changed')::int,
      (v_delta->>'removed')::int,
      (v_delta->>'items')::int
    )
    on conflict(board_id,version) do nothing;

    update public.boards set updated_at=now() where id=p_board_id;

    return jsonb_build_object(
      'ok',true,'conflict',false,'version',1,'updated_at',now()
    );
  end if;

  if p_expected_version is not null and p_expected_version<>v_current_version then
    return jsonb_build_object(
      'ok',false,
      'conflict',true,
      'version',v_current_version,
      'document',v_current_document
    );
  end if;

  v_next_version := v_current_version+1;
  v_delta := public.board_item_delta(v_current_document,p_document);

  update public.board_documents
  set document=p_document,
      version=v_next_version,
      updated_at=now(),
      updated_by=auth.uid()
  where board_id=p_board_id;

  insert into public.board_document_history(board_id,version,document,saved_at,saved_by)
  values(p_board_id,v_next_version,p_document,now(),auth.uid())
  on conflict do nothing;

  insert into public.board_activity(
    board_id,version,actor_id,actor_name,
    added_count,changed_count,removed_count,item_count
  )
  values(
    p_board_id,v_next_version,auth.uid(),v_name,
    (v_delta->>'added')::int,
    (v_delta->>'changed')::int,
    (v_delta->>'removed')::int,
    (v_delta->>'items')::int
  )
  on conflict(board_id,version) do nothing;

  delete from public.board_document_history h
  where h.board_id=p_board_id
    and h.id not in (
      select id from public.board_document_history
      where board_id=p_board_id
      order by version desc
      limit 100
    );

  delete from public.board_activity a
  where a.board_id=p_board_id
    and a.id not in (
      select id from public.board_activity
      where board_id=p_board_id
      order by version desc
      limit 100
    );

  update public.boards set updated_at=now() where id=p_board_id;

  return jsonb_build_object(
    'ok',true,'conflict',false,'version',v_next_version,'updated_at',now()
  );
end
$$;

grant execute on function public.save_board_document(uuid,jsonb,bigint) to authenticated;

commit;
