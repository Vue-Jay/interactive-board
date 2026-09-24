-- OnlineRepetitor v70: safer trash lifecycle
begin;

create or replace function public.list_my_trashed_boards()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'id',id,'title',title,'owner_id',owner_id,'created_at',created_at,'updated_at',updated_at,
   'deleted_at',deleted_at,'purge_after',deleted_at+interval '30 days'
 ) order by deleted_at desc)
 from public.boards where owner_id=auth.uid() and deleted_at is not null),'[]'::jsonb);
end $$;

create or replace function public.delete_board_forever(p_board_id uuid,p_confirmation text)
returns void language plpgsql security definer set search_path=public as $$
declare v_title text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select title into v_title from public.boards where id=p_board_id and owner_id=auth.uid() and deleted_at is not null;
 if v_title is null then raise exception 'Доска не найдена в корзине'; end if;
 if trim(coalesce(p_confirmation,''))<>v_title then raise exception 'Название доски введено неверно'; end if;
 delete from public.boards where id=p_board_id;
end $$;

drop function if exists public.delete_board_forever(uuid);
revoke all on function public.list_my_trashed_boards() from public,anon;
grant execute on function public.list_my_trashed_boards() to authenticated;
revoke all on function public.delete_board_forever(uuid,text) from public,anon;
grant execute on function public.delete_board_forever(uuid,text) to authenticated;
commit;
