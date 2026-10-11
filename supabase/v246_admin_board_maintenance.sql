-- Admin maintenance editing. Apply in Supabase SQL Editor before enabling UI.
-- Admin identity is checked against the server-owned profiles.is_admin flag,
-- never against a client supplied user id or email.
begin;
create table if not exists public.admin_board_edit_log(
 id bigint generated always as identity primary key,
 board_id uuid not null references public.boards(id) on delete cascade,
 admin_id uuid not null references auth.users(id),
 previous_version bigint not null,
 new_version bigint not null,
 created_at timestamptz not null default now()
);
alter table public.admin_board_edit_log enable row level security;
revoke all on public.admin_board_edit_log from anon, authenticated;

create or replace function public.admin_save_board_document(
 p_board_id uuid, p_document jsonb, p_expected_version bigint
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
 v_row public.board_documents%rowtype;
 v_admin boolean;
begin
 select coalesce(p.is_admin,false) into v_admin
 from public.profiles p where p.id = auth.uid();
 if not coalesce(v_admin,false) then
   raise exception 'Administrator privileges required' using errcode='42501';
 end if;
 if p_document is null or jsonb_typeof(p_document)<>'object' then
   raise exception 'Invalid board document';
 end if;
 select * into v_row from public.board_documents
 where board_id=p_board_id for update;
 if not found then raise exception 'Board document not found'; end if;
 if v_row.version is distinct from p_expected_version then
   return jsonb_build_object('ok',false,'conflict',true,'version',v_row.version,
      'document',v_row.document,'updated_at',v_row.updated_at);
 end if;
 update public.board_documents
 set document=p_document, version=v_row.version+1, updated_at=now(), updated_by=auth.uid()
 where board_id=p_board_id;
 insert into public.admin_board_edit_log(board_id,admin_id,previous_version,new_version)
 values (p_board_id,auth.uid(),v_row.version,v_row.version+1);
 return jsonb_build_object('ok',true,'conflict',false,'version',v_row.version+1,'updated_at',now());
end; $$;
revoke all on function public.admin_save_board_document(uuid,jsonb,bigint) from public, anon;
grant execute on function public.admin_save_board_document(uuid,jsonb,bigint) to authenticated;
commit;
