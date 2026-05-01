-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop existing tables if needed (ONLY if you want a clean slate, otherwise keep it)
-- drop table if exists public.chat_starred_messages cascade;
-- drop table if exists public.chat_messages cascade;
-- drop table if exists public.chat_participants cascade;
-- drop table if exists public.chat_conversations cascade;

-- 1. Conversations Table
create table if not exists public.chat_conversations (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('private', 'group', 'cell', 'ministry', 'leaders', 'prayers', 'announcements')),
  name text, -- Optional for groups
  description text,
  entity_id uuid, -- ID of the cell, ministry, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Participants Table
create table if not exists public.chat_participants (
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (conversation_id, profile_id)
);

-- 3. Messages Table
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  type text default 'text' check (type in ('text', 'image', 'file')),
  file_url text,
  is_announcement boolean default false,
  pinned_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Starred Messages Table
create table if not exists public.chat_starred_messages (
  message_id uuid references public.chat_messages(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (message_id, profile_id)
);

-- Enable RLS
alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_starred_messages enable row level security;

-- ---------------------------------------------------------
-- POLICIES FOR CONVERSATIONS
-- ---------------------------------------------------------
drop policy if exists "Users can view conversations they are part of" on public.chat_conversations;
create policy "Users can view conversations they are part of" 
  on public.chat_conversations for select 
  using (
    id in (select conversation_id from public.chat_participants where profile_id = auth.uid())
  );

drop policy if exists "Users can create conversations" on public.chat_conversations;
create policy "Users can create conversations" 
  on public.chat_conversations for insert 
  with check (auth.role() = 'authenticated');

drop policy if exists "Users can delete conversations" on public.chat_conversations;
create policy "Users can delete conversations" 
  on public.chat_conversations for delete 
  using (
    id in (select conversation_id from public.chat_participants where profile_id = auth.uid())
  );

-- ---------------------------------------------------------
-- POLICIES FOR PARTICIPANTS
-- ---------------------------------------------------------
drop policy if exists "Users can view participants" on public.chat_participants;
create policy "Users can view participants" 
  on public.chat_participants for select 
  using (auth.role() = 'authenticated');

drop policy if exists "Users can join conversations" on public.chat_participants;
create policy "Users can join conversations" 
  on public.chat_participants for insert 
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- POLICIES FOR MESSAGES
-- ---------------------------------------------------------
drop policy if exists "Users can view messages in their conversations" on public.chat_messages;
create policy "Users can view messages in their conversations" 
  on public.chat_messages for select 
  using (
    conversation_id in (select conversation_id from public.chat_participants where profile_id = auth.uid())
  );

drop policy if exists "Participants can send messages" on public.chat_messages;
create policy "Participants can send messages" 
  on public.chat_messages for insert 
  with check (
    conversation_id in (select conversation_id from public.chat_participants where profile_id = auth.uid())
  );

drop policy if exists "Participants can update messages" on public.chat_messages;
create policy "Participants can update messages" 
  on public.chat_messages for update 
  using (
    conversation_id in (select conversation_id from public.chat_participants where profile_id = auth.uid())
  );

drop policy if exists "Participants can delete messages" on public.chat_messages;
create policy "Participants can delete messages" 
  on public.chat_messages for delete 
  using (
    conversation_id in (select conversation_id from public.chat_participants where profile_id = auth.uid())
  );

-- ---------------------------------------------------------
-- POLICIES FOR STARRED MESSAGES
-- ---------------------------------------------------------
drop policy if exists "Users can view their stars" on public.chat_starred_messages;
create policy "Users can view their stars" 
  on public.chat_starred_messages for select 
  using (profile_id = auth.uid());

drop policy if exists "Users can star messages" on public.chat_starred_messages;
create policy "Users can star messages" 
  on public.chat_starred_messages for insert 
  with check (profile_id = auth.uid());

drop policy if exists "Users can unstar messages" on public.chat_starred_messages;
create policy "Users can unstar messages" 
  on public.chat_starred_messages for delete 
  using (profile_id = auth.uid());

-- ---------------------------------------------------------
-- FUNCTIONS & AUTOMATION
-- ---------------------------------------------------------

-- Function to get or create a private chat
create or replace function public.get_or_create_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_conversation_id uuid;
  v_my_id uuid := auth.uid();
begin
  -- Check if private chat already exists
  select p1.conversation_id into v_conversation_id
  from public.chat_participants p1
  join public.chat_participants p2 on p1.conversation_id = p2.conversation_id
  join public.chat_conversations c on c.id = p1.conversation_id
  where c.type = 'private'
    and p1.profile_id = v_my_id
    and p2.profile_id = other_user_id
  limit 1;

  -- If not exists, create it
  if v_conversation_id is null then
    insert into public.chat_conversations (type)
    values ('private')
    returning id into v_conversation_id;

    insert into public.chat_participants (conversation_id, profile_id)
    values 
      (v_conversation_id, v_my_id),
      (v_conversation_id, other_user_id);
  end if;

  return v_conversation_id;
end;
$$;

-- Function to sync user with group chats (Cell, Ministry, Leaders)
create or replace function public.sync_user_chats()
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_cell_id uuid;
  v_conv_id uuid;
  v_rec record;
begin
  -- 1. Sync with Cell Chat
  select cell_id into v_cell_id from public.members where id = v_user_id;
  if v_cell_id is not null then
    select id into v_conv_id from public.chat_conversations where type = 'cell' and entity_id = v_cell_id;
    if v_conv_id is null then
      insert into public.chat_conversations (type, name, entity_id, description)
      values ('cell', 'Minha Célula', v_cell_id, 'Chat oficial da célula')
      returning id into v_conv_id;
    end if;
    insert into public.chat_participants (conversation_id, profile_id, role)
    values (v_conv_id, v_user_id, 'member')
    on conflict do nothing;
  end if;

  -- 2. Sync with Ministry Chats
  for v_rec in (select m.id, m.name from public.ministries m join public.ministry_members mm on m.id = mm.ministry_id where mm.member_id = v_user_id) loop
    select id into v_conv_id from public.chat_conversations where type = 'ministry' and entity_id = v_rec.id;
    if v_conv_id is null then
      insert into public.chat_conversations (type, name, entity_id, description)
      values ('ministry', 'Ministério: ' || v_rec.name, v_rec.id, 'Chat do ministério ' || v_rec.name)
      returning id into v_conv_id;
    end if;
    insert into public.chat_participants (conversation_id, profile_id, role)
    values (v_conv_id, v_user_id, 'member')
    on conflict do nothing;
  end loop;
end;
$$;

-- Enable Realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_conversations') then
    alter publication supabase_realtime add table public.chat_conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pg_publication_tables.pubname = 'supabase_realtime' and tablename = 'chat_participants') then
    alter publication supabase_realtime add table public.chat_participants;
  end if;
  if not exists (select 1 from pg_publication_tables where pg_publication_tables.pubname = 'supabase_realtime' and tablename = 'chat_starred_messages') then
    alter publication supabase_realtime add table public.chat_starred_messages;
  end if;
end;
$$;
-- ==========================================
-- STORAGE CONFIGURATION
-- ==========================================

-- Create a bucket for chat attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Permitir upload para usuários autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

-- Policy: Allow authenticated users to view any chat attachment
CREATE POLICY "Permitir visualização para usuários autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat_attachments');

-- Policy: Allow users to delete their own attachments
CREATE POLICY "Permitir exclusão dos próprios anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat_attachments' AND owner = auth.uid());
