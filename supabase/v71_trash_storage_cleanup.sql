-- OnlineRepetitor v71: safe permanent deletion with Storage preflight
begin;

create or replace function public.prepare_board_permanent_delete(p_board_id uuid,p_confirmation text)
returns jsonb language plpgsql security definer set search_path=public,storage as $$
declare v_title text; v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select title into v_title from public.boards where id=p_board_id and owner_id=auth.uid() and deleted_at is not null;
 if v_title is null then raise exception 'Доска не найдена в корзине'; end if;
 if trim(coalesce(p_confirmation,''))<>v_title then raise exception 'Название доски введено неверно'; end if;
 select count(*) into v_count from storage.objects where bucket_id='board-assets' and name like p_board_id::text||'/%';
 return jsonb_build_object('board_id',p_board_id,'asset_count',v_count);
end $$;

create or replace function public.finish_board_permanent_delete(p_board_id uuid,p_confirmation text)
returns void language plpgsql security definer set search_path=public,storage as $$
declare v_title text; v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select title into v_title from public.boards where id=p_board_id and owner_id=auth.uid() and deleted_at is not null;
 if v_title is null then raise exception 'Доска не найдена в корзине'; end if;
 if trim(coalesce(p_confirmation,''))<>v_title then raise exception 'Название доски введено неверно'; end if;
 select count(*) into v_count from storage.objects where bucket_id='board-assets' and name like p_board_id::text||'/%';
 if v_count>0 then raise exception 'Сначала удалите файлы доски из Storage'; end if;
 delete from public.boards where id=p_board_id;
end $$;

drop function if exists public.delete_board_forever(uuid,text);
revoke all on function public.prepare_board_permanent_delete(uuid,text) from public,anon;
grant execute on function public.prepare_board_permanent_delete(uuid,text) to authenticated;
revoke all on function public.finish_board_permanent_delete(uuid,text) from public,anon;
grant execute on function public.finish_board_permanent_delete(uuid,text) to authenticated;

-- Owners may remove assets belonging to their own trashed boards.
drop policy if exists board_assets_delete on storage.objects;
create policy board_assets_delete on storage.objects for delete to authenticated
using (
 bucket_id='board-assets' and (
   public.can_edit_board(public.board_asset_board_id(name))
   or exists(
     select 1 from public.boards b
     where b.id=public.board_asset_board_id(name)
       and b.owner_id=auth.uid()
       and b.deleted_at is not null
   )
 )
);

commit;
