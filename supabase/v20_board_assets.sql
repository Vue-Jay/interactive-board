-- InteractiveBoard v20. Run after v19, or use the complete setup.sql.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-assets', 'board-assets', false, 52428800, array['image/*', 'application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Invalid paths return NULL rather than failing a UUID cast inside RLS.
create or replace function public.board_asset_board_id(object_name text)
returns uuid language sql immutable set search_path = public as $$
  select case when object_name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[a-zA-Z0-9_-]+$'
    then split_part(object_name, '/', 1)::uuid else null end;
$$;

drop policy if exists board_assets_read on storage.objects;
create policy board_assets_read on storage.objects for select to authenticated
using (bucket_id = 'board-assets' and public.can_access_board(public.board_asset_board_id(name)));

drop policy if exists board_assets_insert on storage.objects;
create policy board_assets_insert on storage.objects for insert to authenticated
with check (bucket_id = 'board-assets' and public.can_edit_board(public.board_asset_board_id(name)));

drop policy if exists board_assets_update on storage.objects;
create policy board_assets_update on storage.objects for update to authenticated
using (bucket_id = 'board-assets' and public.can_edit_board(public.board_asset_board_id(name)))
with check (bucket_id = 'board-assets' and public.can_edit_board(public.board_asset_board_id(name)));

drop policy if exists board_assets_delete on storage.objects;
create policy board_assets_delete on storage.objects for delete to authenticated
using (bucket_id = 'board-assets' and public.can_edit_board(public.board_asset_board_id(name)));

commit;
