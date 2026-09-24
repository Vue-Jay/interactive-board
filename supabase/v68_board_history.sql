-- OnlineRepetitor v68: board version history
begin;

create table if not exists public.board_document_history (
  id bigserial primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  version bigint not null,
  document jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null,
  unique(board_id,version)
);
create index if not exists board_document_history_board_saved_idx
  on public.board_document_history(board_id,saved_at desc);

alter table public.board_document_history enable row level security;

drop policy if exists board_document_history_select_access on public.board_document_history;
create policy board_document_history_select_access on public.board_document_history
for select to authenticated using (public.can_access_board(board_id));

create or replace function public.save_board_document(
  p_board_id uuid,
  p_document jsonb,
  p_expected_version bigint default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_current_version bigint; v_current_document jsonb; v_next_version bigint;
begin
 if not public.can_edit_board(p_board_id) then raise exception 'Недостаточно прав для редактирования доски'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_board_id::text,0));
 select version,document into v_current_version,v_current_document from public.board_documents where board_id=p_board_id;
 if not found then
   insert into public.board_documents(board_id,document,version,updated_at,updated_by) values(p_board_id,p_document,1,now(),auth.uid());
   insert into public.board_document_history(board_id,version,document,saved_at,saved_by) values(p_board_id,1,p_document,now(),auth.uid()) on conflict do nothing;
   update public.boards set updated_at=now() where id=p_board_id;
   return jsonb_build_object('ok',true,'conflict',false,'version',1,'updated_at',now());
 end if;
 if p_expected_version is not null and p_expected_version<>v_current_version then
   return jsonb_build_object('ok',false,'conflict',true,'version',v_current_version,'document',v_current_document);
 end if;
 v_next_version:=v_current_version+1;
 update public.board_documents set document=p_document,version=v_next_version,updated_at=now(),updated_by=auth.uid() where board_id=p_board_id;
 insert into public.board_document_history(board_id,version,document,saved_at,saved_by) values(p_board_id,v_next_version,p_document,now(),auth.uid()) on conflict do nothing;
 -- Keep the newest 100 snapshots per board.
 delete from public.board_document_history h where h.board_id=p_board_id and h.id not in
   (select id from public.board_document_history where board_id=p_board_id order by version desc limit 100);
 update public.boards set updated_at=now() where id=p_board_id;
 return jsonb_build_object('ok',true,'conflict',false,'version',v_next_version,'updated_at',now());
end $$;

create or replace function public.list_board_history(p_board_id uuid,p_limit integer default 30)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.can_access_board(p_board_id) then raise exception 'Недостаточно прав'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'id',id,'version',version,'saved_at',saved_at,'saved_by',saved_by,
   'item_count',coalesce(jsonb_array_length(document->'items'),0),
   'title',coalesce(document->>'title','Доска')
 ) order by version desc)
 from (select * from public.board_document_history where board_id=p_board_id order by version desc limit greatest(1,least(coalesce(p_limit,30),100))) h),'[]'::jsonb);
end $$;

create or replace function public.get_board_history_version(p_board_id uuid,p_version bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_doc jsonb;
begin
 if auth.uid() is null or not public.can_access_board(p_board_id) then raise exception 'Недостаточно прав'; end if;
 select document into v_doc from public.board_document_history where board_id=p_board_id and version=p_version;
 if v_doc is null then raise exception 'Версия не найдена'; end if;
 return v_doc;
end $$;

grant execute on function public.save_board_document(uuid,jsonb,bigint) to authenticated;
revoke all on function public.list_board_history(uuid,integer) from public,anon;
grant execute on function public.list_board_history(uuid,integer) to authenticated;
revoke all on function public.get_board_history_version(uuid,bigint) from public,anon;
grant execute on function public.get_board_history_version(uuid,bigint) to authenticated;
commit;
