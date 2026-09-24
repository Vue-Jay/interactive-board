-- OnlineRepetitor v85: secure server comment threads
begin;
create table if not exists public.board_comments(
 id uuid primary key default gen_random_uuid(),
 board_id uuid not null references public.boards(id) on delete cascade,
 author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 author_name text not null default 'Участник',
 parent_id uuid references public.board_comments(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 4000),
 resolved boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists board_comments_board_created_idx on public.board_comments(board_id,created_at);
create index if not exists board_comments_parent_idx on public.board_comments(parent_id);
alter table public.board_comments enable row level security;
drop policy if exists board_comments_select_member on public.board_comments;
drop policy if exists board_comments_insert_member on public.board_comments;
drop policy if exists board_comments_update_author_or_editor on public.board_comments;
drop policy if exists "board comments read" on public.board_comments;
drop policy if exists "board comments insert" on public.board_comments;
drop policy if exists "board comments update" on public.board_comments;
create policy "board comments read" on public.board_comments for select to authenticated using(public.can_access_board(board_id));
create policy "board comments insert" on public.board_comments for insert to authenticated with check(public.can_access_board(board_id) and author_id=auth.uid());
create policy "board comments update" on public.board_comments for update to authenticated using(author_id=auth.uid() or public.can_edit_board(board_id)) with check(public.can_access_board(board_id));
grant select,insert,update on public.board_comments to authenticated;
create or replace function public.board_comment_prepare() returns trigger language plpgsql security definer set search_path=public as $$
declare n text;
begin
 if tg_op='INSERT' then
   new.author_id:=auth.uid();
   select nullif(trim(p.display_name),'') into n from public.profiles p where p.id=auth.uid();
   new.author_name:=coalesce(n,'Участник');
   if new.parent_id is not null and not exists(select 1 from public.board_comments p where p.id=new.parent_id and p.board_id=new.board_id) then raise exception 'Родительский комментарий не найден на этой доске'; end if;
 else
   new.author_id:=old.author_id; new.author_name:=old.author_name; new.board_id:=old.board_id; new.parent_id:=old.parent_id; new.created_at:=old.created_at;
 end if;
 new.updated_at:=now(); return new;
end $$;
drop trigger if exists board_comment_fill_author_trigger on public.board_comments;
drop trigger if exists trg_board_comment_prepare on public.board_comments;
create trigger trg_board_comment_prepare before insert or update on public.board_comments for each row execute function public.board_comment_prepare();
commit;
