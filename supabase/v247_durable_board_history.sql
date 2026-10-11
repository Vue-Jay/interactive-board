-- OnlineRepetitor v247: durable automatic board history for normal and admin saves.
-- Apply once in Supabase SQL Editor. Safe to rerun.
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

create table if not exists public.board_activity (
 id bigserial primary key,
 board_id uuid not null references public.boards(id) on delete cascade,
 version bigint not null,
 actor_id uuid references auth.users(id) on delete set null,
 actor_name text not null default 'Участник',
 added_count integer not null default 0,
 changed_count integer not null default 0,
 removed_count integer not null default 0,
 item_count integer not null default 0,
 created_at timestamptz not null default now(),
 unique(board_id,version)
);
create index if not exists board_activity_board_version_idx
 on public.board_activity(board_id,version desc);
alter table public.board_activity enable row level security;
revoke insert,update,delete on public.board_document_history from anon,authenticated;
revoke insert,update,delete on public.board_activity from anon,authenticated;

-- Count both old pen/marker items and strokes kept in the newer independent
-- "ink" collection. Full-outer joins prevent quadratic array comparisons.
create or replace function public.board_item_delta(p_old jsonb,p_new jsonb)
returns jsonb language sql immutable set search_path=public,pg_temp as $delta$
with
 old_items as (
  select value->>'id' as id,value from jsonb_array_elements(coalesce(p_old->'items','[]'::jsonb))
  union all
  select value->'stroke'->>'id' as id,value->'stroke' as value
   from jsonb_array_elements(coalesce(p_old->'ink','[]'::jsonb))
 ),
 new_items as (
  select value->>'id' as id,value from jsonb_array_elements(coalesce(p_new->'items','[]'::jsonb))
  union all
  select value->'stroke'->>'id' as id,value->'stroke' as value
   from jsonb_array_elements(coalesce(p_new->'ink','[]'::jsonb))
 ),
 combined as (
  select count(*) filter(where o.id is null)::integer added,
         count(*) filter(where n.id is null)::integer removed,
         count(*) filter(where o.id is not null and n.id is not null
                                  and o.value is distinct from n.value)::integer changed
  from new_items n full join old_items o using(id)
 )
select jsonb_build_object(
 'added',(select added from combined),
 'changed',(select changed from combined),
 'removed',(select removed from combined),
 'items',(select count(*)::integer from new_items)
);
$delta$;

-- A database trigger captures changes regardless of whether they were made
-- by a normal editor, an administrator, or a future save endpoint.
create or replace function public.capture_board_document_history()
returns trigger language plpgsql security definer
set search_path=public,pg_temp as $capture$
declare
 v_before jsonb;
 v_delta jsonb;
 v_actor text;
begin
 if tg_op='UPDATE' then
   if new.version=old.version then return new; end if;
   v_before:=old.document;
 else
   v_before:='{"items":[],"ink":[]}'::jsonb;
 end if;
 select nullif(trim(p.display_name),'') into v_actor
 from public.profiles p where p.id=auth.uid();
 v_actor:=coalesce(v_actor,'Участник');
 v_delta:=public.board_item_delta(v_before,new.document);

 insert into public.board_document_history(board_id,version,document,saved_at,saved_by)
 values(new.board_id,new.version,new.document,coalesce(new.updated_at,now()),new.updated_by)
 on conflict(board_id,version) do nothing;

 insert into public.board_activity(
  board_id,version,actor_id,actor_name,
  added_count,changed_count,removed_count,item_count,created_at
 ) values(
  new.board_id,new.version,new.updated_by,v_actor,
  (v_delta->>'added')::integer,(v_delta->>'changed')::integer,
  (v_delta->>'removed')::integer,(v_delta->>'items')::integer,
  coalesce(new.updated_at,now())
 )
 on conflict(board_id,version) do nothing;

 delete from public.board_document_history h where h.board_id=new.board_id
  and h.id not in (select id from public.board_document_history
                   where board_id=new.board_id order by version desc limit 100);
 delete from public.board_activity a where a.board_id=new.board_id
  and a.id not in (select id from public.board_activity
                   where board_id=new.board_id order by version desc limit 100);
 return new;
end;
$capture$;

drop trigger if exists trg_capture_board_document_history on public.board_documents;
create trigger trg_capture_board_document_history
after insert or update of document,version on public.board_documents
for each row execute function public.capture_board_document_history();

-- Seed one recoverable snapshot for boards created before version history was
-- activated. Never overwrite an earlier snapshot.
insert into public.board_document_history(board_id,version,document,saved_at,saved_by)
select bd.board_id,bd.version,bd.document,coalesce(bd.updated_at,now()),bd.updated_by
from public.board_documents bd
where true
on conflict(board_id,version) do nothing;

create or replace function public.list_board_history(p_board_id uuid,p_limit integer default 30)
returns jsonb language plpgsql security definer
set search_path=public,pg_temp as $list_history$
begin
 if auth.uid() is null or not (
   public.can_access_board(p_board_id) or
   coalesce((to_jsonb(public.get_my_account_access())->>'is_admin')::boolean,false)
 ) then raise exception 'Недостаточно прав' using errcode='42501'; end if;

 return coalesce((
   select jsonb_agg(jsonb_build_object(
     'id',h.id,'version',h.version,'saved_at',h.saved_at,
     'saved_by',h.saved_by,
     'saved_by_name',coalesce(nullif(trim(p.display_name),''),a.actor_name,'Участник'),
     'item_count',coalesce(jsonb_array_length(h.document->'items'),0),
     'ink_count',coalesce(jsonb_array_length(h.document->'ink'),0),
     'title',coalesce(h.document->>'title','Доска'),
     'added_count',coalesce(a.added_count,0),
     'removed_count',coalesce(a.removed_count,0),
     'changed_count',coalesce(a.changed_count,0)
   ) order by h.version desc)
   from (
    select * from public.board_document_history
    where board_id=p_board_id order by version desc
    limit greatest(1,least(coalesce(p_limit,30),100))
   ) h
   left join public.board_activity a on a.board_id=h.board_id and a.version=h.version
   left join public.profiles p on p.id=h.saved_by
 ),'[]'::jsonb);
end;
$list_history$;

create or replace function public.get_board_history_version(p_board_id uuid,p_version bigint)
returns jsonb language plpgsql security definer
set search_path=public,pg_temp as $get_version$
declare v_doc jsonb;
begin
 if auth.uid() is null or not (
   public.can_access_board(p_board_id) or
   coalesce((to_jsonb(public.get_my_account_access())->>'is_admin')::boolean,false)
 ) then raise exception 'Недостаточно прав' using errcode='42501'; end if;
 select h.document into v_doc from public.board_document_history h
 where h.board_id=p_board_id and h.version=p_version;
 if v_doc is null then raise exception 'Версия не найдена'; end if;
 return v_doc;
end;
$get_version$;

revoke all on function public.board_item_delta(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.capture_board_document_history() from public,anon,authenticated;
revoke all on function public.list_board_history(uuid,integer) from public,anon;
revoke all on function public.get_board_history_version(uuid,bigint) from public,anon;
grant execute on function public.list_board_history(uuid,integer) to authenticated;
grant execute on function public.get_board_history_version(uuid,bigint) to authenticated;

commit;
