import { DSLEvaluator } from '../../../core/index';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let evaluator: DSLEvaluator | null = null;

export function getEvaluator(): DSLEvaluator {
  if (!evaluator) {
    evaluator = new DSLEvaluator();
  }
  return evaluator;
}

export function getSupabase(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseForUser(token: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function validateAuth(request: Request): Promise<{ valid: boolean; error?: string; userId?: string; supabase?: SupabaseClient }> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { valid: false, error: 'Authorization required. Pass a Bearer token.' };
  }

  // 1. Check static API key from env
  const staticKey = process.env.MNA_API_KEY;
  const staticUserId = process.env.MNA_USER_ID;
  if (staticKey && token === staticKey && staticUserId) {
    return { valid: true, userId: staticUserId, supabase: getSupabaseForUser(token) };
  }

  // 2. Check mna_ prefix keys via SECURITY DEFINER function
  if (token.startsWith('mna_')) {
    const keyHash = hashKey(token);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('validate_api_key', { hash: keyHash });

    if (error || !data || data.length === 0) {
      return { valid: false, error: 'Invalid API key' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row.is_active) {
      return { valid: false, error: 'API key is disabled' };
    }

    await supabase.rpc('touch_api_key', { hash: keyHash });

    return { valid: true, userId: row.user_id, supabase: getSupabaseForUser(token) };
  }

  // 3. Check Supabase JWT
  if (supabaseUrl && supabaseAnonKey) {
    const client = getSupabase();
    const { data: { user }, error } = await client.auth.getUser(token);
    if (!error && user) {
      return { valid: true, userId: user.id, supabase: getSupabaseForUser(token) };
    }
  }

  return { valid: false, error: 'Invalid or expired token' };
}

export function computeBoundingBox(positions: Float32Array): { min: number[]; max: number[] } {
  if (positions.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }
  let minX = positions[0], minY = positions[1], minZ = positions[2];
  let maxX = positions[0], maxY = positions[1], maxZ = positions[2];
  for (let i = 3; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxX = Math.max(maxX, positions[i]);
    maxY = Math.max(maxY, positions[i + 1]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

export function getIndicesFromMesh(mesh: any): number[] {
  const indices: number[] = [];
  for (let f = 0; f < mesh.faces.firstHalfEdge.length; f++) {
    const he = mesh.faces.firstHalfEdge[f];
    indices.push(mesh.halfEdges.origin[he]);
    indices.push(mesh.halfEdges.origin[mesh.halfEdges.next[he]]);
    indices.push(mesh.halfEdges.origin[mesh.halfEdges.next[mesh.halfEdges.next[he]]]);
  }
  return indices;
}
