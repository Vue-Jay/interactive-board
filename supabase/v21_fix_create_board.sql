-- Owner identity comes exclusively from the authenticated JWT, never RPC input.
begin;

create or replace function public.create_board(p_title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_board public.boards%rowtype;
begin
  if v_owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.boards (title, owner_id)
  values (coalesce(nullif(btrim(p_title), ''), 'Новая доска'), v_owner)
  returning * into v_board;

  return to_jsonb(v_board);
end;
$$;

revoke all on function public.create_board(text) from public, anon;
grant execute on function public.create_board(text) to authenticated;

commit;
