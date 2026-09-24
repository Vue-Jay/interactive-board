-- OnlineRepetitor v64: expiring and limited-use share links
begin;
alter table public.board_share_links add column if not exists max_uses integer;
alter table public.board_share_links add column if not exists use_count integer not null default 0;
alter table public.board_share_links drop constraint if exists board_share_links_max_uses_check;
alter table public.board_share_links add constraint board_share_links_max_uses_check check (max_uses is null or max_uses between 1 and 10000);

drop function if exists public.create_board_share_link(uuid,text);
create function public.create_board_share_link(p_board_id uuid,p_role text,p_expires_at timestamptz default null,p_max_uses integer default null)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_token text; v_link public.board_share_links%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_role not in ('editor','viewer') then raise exception 'Некорректная роль'; end if;
 if p_expires_at is not null and p_expires_at<=now() then raise exception 'Срок действия должен быть в будущем'; end if;
 if p_max_uses is not null and (p_max_uses<1 or p_max_uses>10000) then raise exception 'Некорректный лимит входов'; end if;
 if not public.is_board_owner(p_board_id) then raise exception 'Недостаточно прав'; end if;
 v_token:=encode(gen_random_bytes(32),'hex');
 insert into public.board_share_links(board_id,token_hash,role,created_by,expires_at,max_uses)
 values(p_board_id,encode(digest(v_token,'sha256'),'hex'),p_role,auth.uid(),p_expires_at,p_max_uses) returning * into v_link;
 return jsonb_build_object('id',v_link.id,'board_id',v_link.board_id,'role',v_link.role,'created_at',v_link.created_at,'expires_at',v_link.expires_at,'max_uses',v_link.max_uses,'use_count',v_link.use_count,'token',v_token);
end $$;

create or replace function public.list_board_share_links(p_board_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not public.is_board_owner(p_board_id) then raise exception 'Недостаточно прав'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'board_id',board_id,'role',role,'created_at',created_at,'expires_at',expires_at,'revoked_at',revoked_at,'max_uses',max_uses,'use_count',use_count) order by created_at desc)
 from public.board_share_links where board_id=p_board_id),'[]'::jsonb);
end $$;

create or replace function public.redeem_board_share_link(p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_user uuid:=auth.uid(); v_link public.board_share_links%rowtype; v_board public.boards%rowtype; v_existing_role text; v_effective_role text;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_token is null or length(trim(p_token))<32 then raise exception 'Некорректная ссылка'; end if;
 select * into v_link from public.board_share_links where token_hash=encode(digest(trim(p_token),'sha256'),'hex') and revoked_at is null and (expires_at is null or expires_at>now()) and (max_uses is null or use_count<max_uses) for update limit 1;
 if not found then raise exception 'Ссылка недействительна, истекла или исчерпала лимит входов'; end if;
 select * into v_board from public.boards where id=v_link.board_id;
 if not found then raise exception 'Доска не найдена'; end if;
 if v_board.owner_id=v_user then v_effective_role:='owner';
 else
   select role into v_existing_role from public.board_members where board_id=v_link.board_id and user_id=v_user;
   v_effective_role:=case when v_existing_role='editor' or v_link.role='editor' then 'editor' else 'viewer' end;
   insert into public.board_members(board_id,user_id,role) values(v_link.board_id,v_user,v_effective_role)
   on conflict(board_id,user_id) do update set role=case when public.board_members.role='editor' or excluded.role='editor' then 'editor' else 'viewer' end;
 end if;
 update public.board_share_links set use_count=use_count+1 where id=v_link.id;
 return jsonb_build_object('id',v_board.id,'title',v_board.title,'owner_id',v_board.owner_id,'role',v_effective_role,'created_at',v_board.created_at,'updated_at',v_board.updated_at);
end $$;

revoke all on function public.create_board_share_link(uuid,text,timestamptz,integer) from public,anon;
grant execute on function public.create_board_share_link(uuid,text,timestamptz,integer) to authenticated;
revoke all on function public.list_board_share_links(uuid) from public,anon;
grant execute on function public.list_board_share_links(uuid) to authenticated;
revoke all on function public.redeem_board_share_link(text) from public,anon;
grant execute on function public.redeem_board_share_link(text) to authenticated;
commit;
