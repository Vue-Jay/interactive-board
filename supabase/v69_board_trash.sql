-- OnlineRepetitor v69: board trash with restore and permanent delete
begin;

alter table public.boards add column if not exists deleted_at timestamptz;

create index if not exists boards_owner_deleted_idx on public.boards(owner_id,deleted_at);

create or replace function public.is_board_owner(p_board_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.boards b where b.id=p_board_id and b.owner_id=auth.uid() and b.deleted_at is null);
$$;
create or replace function public.can_access_board(p_board_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.boards b where b.id=p_board_id and b.owner_id=auth.uid() and b.deleted_at is null)
      or exists(select 1 from public.board_members m join public.boards b on b.id=m.board_id
                where m.board_id=p_board_id and m.user_id=auth.uid() and b.deleted_at is null);
$$;
create or replace function public.can_edit_board(p_board_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.boards b where b.id=p_board_id and b.owner_id=auth.uid() and b.deleted_at is null)
      or exists(select 1 from public.board_members m join public.boards b on b.id=m.board_id
                where m.board_id=p_board_id and m.user_id=auth.uid() and m.role='editor' and b.deleted_at is null);
$$;

drop policy if exists boards_select_access on public.boards;
create policy boards_select_access on public.boards for select to authenticated
using (owner_id=auth.uid() or (deleted_at is null and public.can_access_board(id)));

create or replace function public.trash_board(p_board_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.boards where id=p_board_id and owner_id=auth.uid()) then raise exception 'Недостаточно прав'; end if;
 update public.boards set deleted_at=now(),updated_at=now() where id=p_board_id and deleted_at is null;
end $$;

create or replace function public.restore_board(p_board_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.boards where id=p_board_id and owner_id=auth.uid()) then raise exception 'Недостаточно прав'; end if;
 update public.boards set deleted_at=null,updated_at=now() where id=p_board_id;
end $$;

create or replace function public.delete_board_forever(p_board_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.boards where id=p_board_id and owner_id=auth.uid() and deleted_at is not null) then raise exception 'Доска не найдена в корзине'; end if;
 delete from public.boards where id=p_board_id;
end $$;

revoke all on function public.trash_board(uuid) from public,anon;
grant execute on function public.trash_board(uuid) to authenticated;
revoke all on function public.restore_board(uuid) from public,anon;
grant execute on function public.restore_board(uuid) to authenticated;
revoke all on function public.delete_board_forever(uuid) from public,anon;
grant execute on function public.delete_board_forever(uuid) to authenticated;
commit;
