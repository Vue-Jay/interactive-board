-- OnlineRepetitor v89: complete collaborative audit/history backend.
-- Every successful server save now produces an immutable activity entry with actor and object-level delta.
begin;

create table if not exists public.board_activity (
  id bigserial primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  version bigint not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Участник',
  added_count integer not null default 0 check (added_count >= 0),
  changed_count integer not null default 0 check (changed_count >= 0),
  removed_count integer not null default 0 check (removed_count >= 0),
  item_count integer not null default 0 check (item_count >= 0),
  created_at timestamptz not null default now(),
  unique(board_id, version)
);
create index if not exists board_activity_board_version_idx
  on public.board_activity(board_id, version desc);

alter table public.board_activity enable row level security;
drop policy if exists board_activity_select_access on public.board_activity;
create policy board_activity_select_access on public.board_activity
for select to authenticated using (public.can_access_board(board_id));

revoke insert,update,delete on public.board_activity from anon,authenticated;
grant select on public.board_activity to authenticated;

create or replace function public.board_item_delta(p_old jsonb,p_new jsonb)
returns jsonb language sql immutable set search_path=public as $$
with
 old_items as (
   select value->>'id' id,value
   from jsonb_array_elements(coalesce(p_old->'items','[]'::jsonb))
   where nullif(value->>'id','') is not null
 ),
 new_items as (
   select value->>'id' id,value
   from jsonb_array_elements(coalesce(p_new->'items','[]'::jsonb))
   where nullif(value->>'id','') is not null
 ),
 added as (select count(*)::int n from new_items n left join old_items o using(id) where o.id is null),
 removed as (select count(*)::int n from old_items o left join new_items n using(id) where n.id is null),
 changed as (select count(*)::int n from new_items n join old_items o using(id) where n.value is distinct from o.value)
select jsonb_build_object(
 'added',(select n from added),
 'changed',(select n from changed),
 'removed',(select n from removed),
 'items',coalesce(jsonb_array_length(p_new->'items'),0)
) $$;

create or replace function public.save_board_document(
  p_board_id uuid,
  p_document jsonb,
  p_expected_version bigint default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_current_version bigint; v_current_document jsonb; v_next_version bigint;
 v_delta jsonb; v_name text;
begin
 if not public.can_edit_board(p_board_id) then raise exception 'Недостаточно прав для редактирования доски'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_board_id::text,0));
 select version,document into v_current_version,v_current_document
 from public.board_documents where board_id=p_board_id;

 select nullif(trim(display_name),'') into v_name from public.profiles where id=auth.uid();
 v_name:=coalesce(v_name,'Участник');

 if not found then
   v_delta:=public.board_item_delta('{"items":[]}'::jsonb,p_document);
   insert into public.board_documents(board_id,document,version,updated_at,updated_by)
   values(p_board_id,p_document,1,now(),auth.uid());
   insert into public.board_document_history(board_id,version,document,saved_at,saved_by)
   values(p_board_id,1,p_document,now(),auth.uid()) on conflict do nothing;
   insert into public.board_activity(board_id,version,actor_id,actor_name,added_count,changed_count,removed_count,item_count)
   values(p_board_id,1,auth.uid(),v_name,(v_delta->>'added')::int,(v_delta->>'changed')::int,(v_delta->>'removed')::int,(v_delta->>'items')::int)
   on conflict(board_id,version) do nothing;
   update public.boards set updated_at=now() where id=p_board_id;
   return jsonb_build_object('ok',true,'conflict',false,'version',1,'updated_at',now());
 end if;

 if p_expected_version is not null and p_expected_version<>v_current_version then
   return jsonb_build_object('ok',false,'conflict',true,'version',v_current_version,'document',v_current_document);
 end if;

 v_next_version:=v_current_version+1;
 v_delta:=public.board_item_delta(v_current_document,p_document);

 update public.board_documents
 set document=p_document,version=v_next_version,updated_at=now(),updated_by=auth.uid()
 where board_id=p_board_id;

 insert into public.board_document_history(board_id,version,document,saved_at,saved_by)
 values(p_board_id,v_next_version,p_document,now(),auth.uid()) on conflict do nothing;

 insert into public.board_activity(board_id,version,actor_id,actor_name,added_count,changed_count,removed_count,item_count)
 values(p_board_id,v_next_version,auth.uid(),v_name,(v_delta->>'added')::int,(v_delta->>'changed')::int,(v_delta->>'removed')::int,(v_delta->>'items')::int)
 on conflict(board_id,version) do nothing;

 delete from public.board_document_history h where h.board_id=p_board_id and h.id not in
   (select id from public.board_document_history where board_id=p_board_id order by version desc limit 100);
 delete from public.board_activity a where a.board_id=p_board_id and a.id not in
   (select id from public.board_activity where board_id=p_board_id order by version desc limit 100);

 update public.boards set updated_at=now() where id=p_board_id;
 return jsonb_build_object('ok',true,'conflict',false,'version',v_next_version,'updated_at',now());
end $$;

create or replace function public.list_board_activity(p_board_id uuid,p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.can_access_board(p_board_id) then raise exception 'Недостаточно прав'; end if;
 return coalesce((
   select jsonb_agg(jsonb_build_object(
     'id',id,'version',version,'created_at',created_at,'actor_id',actor_id,'actor_name',actor_name,
     'added_count',added_count,'changed_count',changed_count,'removed_count',removed_count,'item_count',item_count,
     'summary',case
       when added_count+changed_count+removed_count=0 then 'Сохранение без изменений объектов'
       else concat_ws(' · ',
         case when added_count>0 then '+'||added_count||' добавлено' end,
         case when changed_count>0 then '~'||changed_count||' изменено' end,
         case when removed_count>0 then '−'||removed_count||' удалено' end)
     end
   ) order by version desc)
   from (select * from public.board_activity where board_id=p_board_id order by version desc limit greatest(1,least(coalesce(p_limit,100),100))) q
 ),'[]'::jsonb);
end $$;

revoke all on function public.board_item_delta(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.list_board_activity(uuid,integer) from public,anon;
grant execute on function public.list_board_activity(uuid,integer) to authenticated;
grant execute on function public.save_board_document(uuid,jsonb,bigint) to authenticated;

-- Backfill an audit row for already existing history versions. Older versions cannot
-- reliably recover the original display name after profile changes, so the current
-- profile name is used where available.
insert into public.board_activity(board_id,version,actor_id,actor_name,added_count,changed_count,removed_count,item_count,created_at)
select h.board_id,h.version,h.saved_by,coalesce(nullif(trim(p.display_name),''),'Участник'),
       coalesce((public.board_item_delta(coalesce(prev.document,'{"items":[]}'::jsonb),h.document)->>'added')::int,0),
       coalesce((public.board_item_delta(coalesce(prev.document,'{"items":[]}'::jsonb),h.document)->>'changed')::int,0),
       coalesce((public.board_item_delta(coalesce(prev.document,'{"items":[]}'::jsonb),h.document)->>'removed')::int,0),
       coalesce(jsonb_array_length(h.document->'items'),0),h.saved_at
from public.board_document_history h
left join public.board_document_history prev on prev.board_id=h.board_id and prev.version=h.version-1
left join public.profiles p on p.id=h.saved_by
on conflict(board_id,version) do nothing;

commit;
