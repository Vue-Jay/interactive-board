-- OnlineRepetitor v121
-- The lesson chat deliberately reuses the proven board_comments backend.
-- This migration adds an index tuned for chronological chat reads and realtime refreshes.
begin;
create index if not exists board_comments_board_created_idx
  on public.board_comments(board_id, created_at asc);
commit;
