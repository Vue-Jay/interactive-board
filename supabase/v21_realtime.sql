-- InteractiveBoard v21: publish board documents; existing SELECT RLS still applies.
-- Run after v20. Safe to run repeatedly.
begin;
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'board_documents'
  ) then
    alter publication supabase_realtime add table public.board_documents;
  end if;
end;
$$;
commit;
