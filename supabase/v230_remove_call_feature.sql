-- OnlineRepetitor v230 · remove board call backend artifacts
-- Safe to run after the historical call migration.

do $$
begin
  begin
    alter publication supabase_realtime drop table public.board_call_signals;
  exception when undefined_object then null;
  end;
end $$;

drop function if exists public.cleanup_old_board_call_signals();
drop table if exists public.board_call_signals cascade;
