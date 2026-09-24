alter table public.profiles add column if not exists theme text not null default 'system' check(theme in('system','light','dark'));
alter table public.profiles add column if not exists compact_ui boolean not null default false;
alter table public.profiles add column if not exists default_board_zoom integer not null default 100 check(default_board_zoom between 50 and 200);
create or replace function public.get_my_profile_settings()
returns table(display_name text,theme text,compact_ui boolean,default_board_zoom integer)
language sql security definer set search_path=public stable as $$
 select p.display_name,p.theme,p.compact_ui,p.default_board_zoom from public.profiles p where p.id=auth.uid() $$;
revoke all on function public.get_my_profile_settings() from public,anon;grant execute on function public.get_my_profile_settings() to authenticated;
create or replace function public.save_my_profile_settings(p_display_name text,p_theme text,p_compact_ui boolean,p_default_board_zoom integer)
returns void language plpgsql security definer set search_path=public as $$
begin
 if length(trim(p_display_name))<2 then raise exception 'Имя должно содержать минимум 2 символа';end if;
 if p_theme not in('system','light','dark') then raise exception 'Некорректная тема';end if;
 insert into public.profiles(id,display_name,theme,compact_ui,default_board_zoom)
 values(auth.uid(),trim(p_display_name),p_theme,p_compact_ui,greatest(50,least(200,p_default_board_zoom)))
 on conflict(id) do update set display_name=excluded.display_name,theme=excluded.theme,compact_ui=excluded.compact_ui,default_board_zoom=excluded.default_board_zoom;
 update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('display_name',trim(p_display_name)) where id=auth.uid();
end $$;
revoke all on function public.save_my_profile_settings(text,text,boolean,integer) from public,anon;grant execute on function public.save_my_profile_settings(text,text,boolean,integer) to authenticated;
