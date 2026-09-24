-- OnlineRepetitor v47: template assets
insert into storage.buckets(id,name,public,file_size_limit)
values('template-assets','template-assets',false,52428800)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;

drop policy if exists template_assets_select on storage.objects;
drop policy if exists template_assets_insert on storage.objects;
drop policy if exists template_assets_delete on storage.objects;
create policy template_assets_select on storage.objects for select to authenticated
using(bucket_id='template-assets' and split_part(name,'/',1)=auth.uid()::text);
create policy template_assets_insert on storage.objects for insert to authenticated
with check(bucket_id='template-assets' and split_part(name,'/',1)=auth.uid()::text);
create policy template_assets_delete on storage.objects for delete to authenticated
using(bucket_id='template-assets' and split_part(name,'/',1)=auth.uid()::text);

create or replace function public.delete_template_assets(p_template_id uuid)
returns void language plpgsql security definer set search_path=public,storage as $$
begin
 if not exists(select 1 from public.board_templates where id=p_template_id and owner_id=auth.uid()) then
   -- template row can already be deleted by the client; ownership is also encoded in the path
   delete from storage.objects where bucket_id='template-assets' and name like auth.uid()::text||'/'||p_template_id::text||'/%';
   return;
 end if;
 delete from storage.objects where bucket_id='template-assets' and name like auth.uid()::text||'/'||p_template_id::text||'/%';
end $$;
grant execute on function public.delete_template_assets(uuid) to authenticated;
