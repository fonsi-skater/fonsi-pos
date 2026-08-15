-- Phase 4: Storage bucket for product images
-- Public read (so receipts/POS/product cards can hotlink images without
-- signed URLs), write restricted to business members of the business
-- whose ID is the first path segment: product-images/<business_id>/<file>.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "business members upload their own product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and is_business_member((storage.foldername(name))[1]::uuid)
  );

create policy "business members update their own product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and is_business_member((storage.foldername(name))[1]::uuid)
  );

create policy "business members delete their own product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and is_business_member((storage.foldername(name))[1]::uuid)
  );
