-- ALVERO E-Commerce Platform
-- Migration 004: Supabase Storage Buckets & Policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alvero-media',
  'alvero-media',
  true,
  5242880, -- 5 MB max per compressed asset to stay well within Supabase Free 1GB storage
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'image/x-icon']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access for storefront media
create policy "Public can view alvero-media"
  on storage.objects for select
  using (bucket_id = 'alvero-media');

-- Admin upload/update/delete access only
create policy "Admins can upload to alvero-media"
  on storage.objects for insert
  with check (
    bucket_id = 'alvero-media'
    and (
      public.has_admin_permission('products:write')
      or public.has_admin_permission('categories:write')
      or public.has_admin_permission('content:write')
      or public.has_admin_permission('settings:write')
    )
  );

create policy "Admins can update alvero-media"
  on storage.objects for update
  using (
    bucket_id = 'alvero-media'
    and (
      public.has_admin_permission('products:write')
      or public.has_admin_permission('categories:write')
      or public.has_admin_permission('content:write')
      or public.has_admin_permission('settings:write')
    )
  );

create policy "Admins can delete alvero-media"
  on storage.objects for delete
  using (
    bucket_id = 'alvero-media'
    and (
      public.has_admin_permission('products:write')
      or public.has_admin_permission('categories:write')
      or public.has_admin_permission('content:write')
      or public.has_admin_permission('settings:write')
    )
  );
