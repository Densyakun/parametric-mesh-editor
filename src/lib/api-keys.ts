// API Key management for AI agent access

import { supabase } from './supabase';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

// Generate a random API key
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return 'mna_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Create a new API key
export async function createApiKey(userId: string, name: string): Promise<ApiKey | null> {
  const key = generateApiKey();

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: await hashKey(key),
      key_prefix: key.substring(0, 7),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating API key:', error);
    return null;
  }

  // Return the full key only on creation
  return {
    id: data.id,
    name: data.name,
    key, // Full key shown only once
    created_at: data.created_at,
    last_used_at: null,
    is_active: true,
  };
}

// List API keys for a user (without the full key)
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, is_active')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing API keys:', error);
    return [];
  }

  return data.map(k => ({
    id: k.id,
    name: k.name,
    key: k.key_prefix + '...',
    created_at: k.created_at,
    last_used_at: k.last_used_at,
    is_active: k.is_active,
  }));
}

// Delete an API key
export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);

  return !error;
}

// Toggle API key active state
export async function toggleApiKey(userId: string, keyId: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: isActive })
    .eq('id', keyId)
    .eq('user_id', userId);

  return !error;
}

// Validate an API key (used by the API server)
export async function validateApiKey(key: string): Promise<{ userId: string; valid: boolean }> {
  const keyHash = await hashKey(key);

  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, is_active')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { userId: '', valid: false };
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash);

  return { userId: data.user_id, valid: true };
}

// Hash an API key for storage
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
