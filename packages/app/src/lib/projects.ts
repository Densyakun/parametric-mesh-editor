// Project storage using Supabase

import { supabase } from './supabase';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  dsl: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_public: boolean;
}

// Create a new project
export async function createProject(
  userId: string,
  name: string,
  dsl: string,
  description?: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name,
      dsl,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  return data;
}

// List projects for a user
export async function listProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error listing projects:', error);
    return [];
  }

  return data ?? [];
}

// Get a project by ID
export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error getting project:', error);
    return null;
  }

  return data;
}

// Update a project
export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, 'name' | 'dsl' | 'description' | 'is_public'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId);

  return !error;
}

// Delete a project
export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  return !error;
}

// Save/update project DSL (convenience function)
export async function saveProjectDSL(
  projectId: string,
  dsl: string
): Promise<boolean> {
  return updateProject(projectId, { dsl });
}
