-- OnlineRepetitor v240: administrator read-only board inspection.
-- Run after v82_teacher_approval.sql and the current board migrations.
begin;

-- Administrators may read every active board and everything protected through can_access_board,
-- but can_edit_board remains unchanged, so inspection stays read-only unless the admin is
-- already the owner/editor through normal membership.
create or replace function public.can_access_board(p_board_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_app_admin(auth.uid())
      or exists(select 1 from public.boards b where b.id=p_board_id and b.owner_id=auth.uid() and b.deleted_at is null)
      or exists(select 1 from public.board_members m join public.boards b on b.id=m.board_id
                where m.board_id=p_board_id and m.user_id=auth.uid() and b.deleted_at is null);
$$;

create or replace function public.admin_list_boards()
returns table(
  id uuid,
  title text,
  owner_id uuid,
  owner_name text,
  owner_email text,
  member_count bigint,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Недостаточно прав' using errcode='42501';
  end if;
  return query
    select b.id,b.title,b.owner_id,
           coalesce(p.display_name,'Пользователь')::text,
           coalesce(p.email,'')::text,
           (select count(*) from public.board_members bm where bm.board_id=b.id),
           b.created_at,b.updated_at,b.deleted_at
    from public.boards b
    left join public.profiles p on p.id=b.owner_id
    where b.deleted_at is null
    order by b.updated_at desc;
end $$;

revoke all on function public.admin_list_boards() from public,anon,authenticated;
grant execute on function public.admin_list_boards() to authenticated;
grant execute on function public.can_access_board(uuid) to authenticated;

commit;
