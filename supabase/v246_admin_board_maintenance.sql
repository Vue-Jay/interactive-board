-- Admin maintenance editing. Apply in Supabase SQL Editor before enabling UI.
-- Admin identity is checked through the existing get_my_account_access RPC,
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
 select coalesce((to_jsonb(public.get_my_account_access())->>'is_admin')::boolean,false)
 into v_admin;
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

-- Admins must also be allowed to fetch and upload board attachments.
-- This checks the same server-side role as the application's account access RPC.
create or replace function public.admin_can_maintain_boards()
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$
 select coalesce((to_jsonb(public.get_my_account_access())->>'is_admin')::boolean,false);
$$;
revoke all on function public.admin_can_maintain_boards() from public,anon;
grant execute on function public.admin_can_maintain_boards() to authenticated;

drop policy if exists "admin maintenance select board assets" on storage.objects;
create policy "admin maintenance select board assets" on storage.objects
for select to authenticated using (
 bucket_id='board-assets' and public.admin_can_maintain_boards()
);
drop policy if exists "admin maintenance upload board assets" on storage.objects;
create policy "admin maintenance upload board assets" on storage.objects
for insert to authenticated with check (
 bucket_id='board-assets' and public.admin_can_maintain_boards()
);
drop policy if exists "admin maintenance update board assets" on storage.objects;
create policy "admin maintenance update board assets" on storage.objects
for update to authenticated using (
 bucket_id='board-assets' and public.admin_can_maintain_boards()
) with check (
 bucket_id='board-assets' and public.admin_can_maintain_boards()
);

-- Include boards that the selected user joined by invitation, not only owned.
create or replace function public.admin_list_user_workspace(p_user_id uuid)
returns table(
 id uuid,title text,owner_id uuid,created_at timestamptz,updated_at timestamptz,
 deleted_at timestamptz,owner_name text,owner_email text,member_count bigint
) language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.admin_can_maintain_boards() then
   raise exception 'Administrator privileges required' using errcode='42501';
 end if;
 return query
 select b.id,b.title,b.owner_id,b.created_at,b.updated_at,b.deleted_at,
   coalesce(p.display_name,'Пользователь')::text,
   coalesce(u.email,'')::text,
   (select count(*) from public.board_members bm where bm.board_id=b.id)
 from public.boards b
 left join public.profiles p on p.id=b.owner_id
 left join auth.users u on u.id=b.owner_id
 where b.deleted_at is null
   and (b.owner_id=p_user_id or exists(
     select 1 from public.board_members m where m.board_id=b.id and m.user_id=p_user_id))
 order by b.updated_at desc;
end; $$;
revoke all on function public.admin_list_user_workspace(uuid) from public,anon;
grant execute on function public.admin_list_user_workspace(uuid) to authenticated;

commit;
