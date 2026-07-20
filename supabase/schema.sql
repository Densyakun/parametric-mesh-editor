-- Supabase Database Schema for MeshNative
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Untitled',
  description text,
  dsl text not null default '<Model></Model>',
  is_public boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- API Keys table
create table if not exists api_keys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  last_used_at timestamp with time zone
);

-- Indexes
create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists api_keys_user_id_idx on api_keys(user_id);
create index if not exists api_keys_key_hash_idx on api_keys(key_hash);

-- Row Level Security (RLS)
alter table projects enable row level security;
alter table api_keys enable row level security;

-- Projects policies
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- API Keys policies
create policy "Users can view their own API keys"
  on api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert their own API keys"
  on api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own API keys"
  on api_keys for update
  using (auth.uid() = user_id);

create policy "Users can delete their own API keys"
  on api_keys for delete
  using (auth.uid() = user_id);

-- Function to update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for projects
create trigger projects_updated_at
  before update on projects
  for each row
  execute function update_updated_at();
