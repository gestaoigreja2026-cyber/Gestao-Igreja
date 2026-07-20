-- Criar a pasta de logos
insert into storage.buckets (id, name, public) 
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Criar a pasta de banners
insert into storage.buckets (id, name, public) 
values ('banners', 'banners', true)
on conflict (id) do nothing;

-- Permitir que qualquer pessoa veja as imagens
create policy "public_read_logos" on storage.objects for select using ( bucket_id = 'logos' );
create policy "public_read_banners" on storage.objects for select using ( bucket_id = 'banners' );

-- Permitir o envio de novas imagens (qualquer usuário, mesmo sem login)
create policy "allow_insert_logos" on storage.objects for insert with check ( bucket_id = 'logos' );
create policy "allow_insert_banners" on storage.objects for insert with check ( bucket_id = 'banners' );

-- Permitir atualização de imagens existentes
create policy "allow_update_logos" on storage.objects for update using ( bucket_id = 'logos' );
create policy "allow_update_banners" on storage.objects for update using ( bucket_id = 'banners' );
