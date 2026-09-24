-- OnlineRepetitor v88: richer board history with author and object-level change summary.
begin;

create or replace function public.list_board_history(p_board_id uuid,p_limit integer default 30)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.can_access_board(p_board_id) then raise exception 'Недостаточно прав'; end if;
 return coalesce((
  with versions as (
   select h.*,lag(h.document) over(order by h.version) as previous_document
   from public.board_document_history h where h.board_id=p_board_id
  ), enriched as (
   select v.*,
    coalesce((select nullif(trim(p.display_name),'') from public.profiles p where p.id=v.saved_by),'Участник') as saved_by_name,
    (select count(*) from jsonb_array_elements(coalesce(v.document->'items','[]'::jsonb)) n
      where v.previous_document is null or not exists(
       select 1 from jsonb_array_elements(coalesce(v.previous_document->'items','[]'::jsonb)) o where o->>'id'=n->>'id'
      )) as added_count,
    (select count(*) from jsonb_array_elements(coalesce(v.previous_document->'items','[]'::jsonb)) o
      where not exists(
       select 1 from jsonb_array_elements(coalesce(v.document->'items','[]'::jsonb)) n where n->>'id'=o->>'id'
      )) as removed_count,
    (select count(*) from jsonb_array_elements(coalesce(v.document->'items','[]'::jsonb)) n
      join jsonb_array_elements(coalesce(v.previous_document->'items','[]'::jsonb)) o on o->>'id'=n->>'id'
      where n is distinct from o) as changed_count
   from versions v
  )
  select jsonb_agg(jsonb_build_object(
   'id',id,'version',version,'saved_at',saved_at,'saved_by',saved_by,'saved_by_name',saved_by_name,
   'item_count',coalesce(jsonb_array_length(document->'items'),0),'title',coalesce(document->>'title','Доска'),
   'added_count',added_count,'removed_count',removed_count,'changed_count',changed_count
  ) order by version desc)
  from (select * from enriched order by version desc limit greatest(1,least(coalesce(p_limit,30),100))) h
 ),'[]'::jsonb);
end $$;

revoke all on function public.list_board_history(uuid,integer) from public,anon;
grant execute on function public.list_board_history(uuid,integer) to authenticated;
commit;
