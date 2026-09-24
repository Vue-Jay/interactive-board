-- OnlineRepetitor v67: active share-link list cleanup
begin;
create or replace function public.list_board_share_links(p_board_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not public.is_board_owner(p_board_id) then raise exception 'Недостаточно прав'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'id',id,'board_id',board_id,'role',role,'created_at',created_at,'expires_at',expires_at,
   'revoked_at',revoked_at,'max_uses',max_uses,'use_count',use_count,'protected',password_hash is not null
 ) order by created_at desc)
 from public.board_share_links
 where board_id=p_board_id
   and revoked_at is null
   and (expires_at is null or expires_at>now())
   and (max_uses is null or use_count<max_uses)
 ),'[]'::jsonb);
end $$;
revoke all on function public.list_board_share_links(uuid) from public,anon;
grant execute on function public.list_board_share_links(uuid) to authenticated;
commit;
