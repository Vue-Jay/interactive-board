-- OnlineRepetitor v122
-- Makes the existing board chat reliably visible to Supabase Realtime.
begin;
create index if not exists board_comments_board_created_idx
  on public.board_comments(board_id, created_at asc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='board_comments'
  ) then
    alter publication supabase_realtime add table public.board_comments;
  end if;
end $$;
commit;
