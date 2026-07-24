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

-- SECURITY DEFINER functions for server-side API key validation (bypasses RLS)
create or replace function validate_api_key(hash text)
returns table(user_id uuid, is_active boolean)
language sql
security definer
set search_path = public
as $$
  select ak.user_id, ak.is_active
  from api_keys ak
  where ak.key_hash = hash
  limit 1;
$$;

create or replace function touch_api_key(hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update api_keys set last_used_at = now() where key_hash = hash;
$$;

-- SECURITY DEFINER functions for project CRUD (bypasses RLS for API key auth)
create or replace function list_projects(uid uuid)
returns table(id uuid, user_id uuid, name text, description text, dsl text, is_public boolean, created_at timestamptz, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select p.id, p.user_id, p.name, p.description, p.dsl, p.is_public, p.created_at, p.updated_at
  from projects p where p.user_id = uid order by p.updated_at desc;
$$;

create or replace function get_project(project_id uuid, uid uuid)
returns table(id uuid, user_id uuid, name text, description text, dsl text, is_public boolean, created_at timestamptz, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select p.id, p.user_id, p.name, p.description, p.dsl, p.is_public, p.created_at, p.updated_at
  from projects p where p.id = project_id and p.user_id = uid;
$$;

create or replace function create_project(uid uuid, project_name text, project_dsl text, project_description text default null)
returns table(id uuid, user_id uuid, name text, description text, dsl text, is_public boolean, created_at timestamptz, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  insert into projects (user_id, name, dsl, description) values (uid, project_name, project_dsl, project_description)
  returning id, user_id, name, description, dsl, is_public, created_at, updated_at;
$$;

create or replace function update_project(project_id uuid, uid uuid, project_name text default null, project_dsl text default null, project_description text default null)
returns table(id uuid, user_id uuid, name text, description text, dsl text, is_public boolean, created_at timestamptz, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  update projects set
    name = coalesce(project_name, name),
    dsl = coalesce(project_dsl, dsl),
    description = project_description,
    updated_at = now()
  where id = project_id and user_id = uid
  returning id, user_id, name, description, dsl, is_public, created_at, updated_at;
$$;

create or replace function delete_project(project_id uuid, uid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from projects where id = project_id and user_id = uid;
$$;
