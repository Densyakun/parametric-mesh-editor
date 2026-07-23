import { DSLEvaluator } from '../../../core/index';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let evaluator: DSLEvaluator | null = null;

export function getEvaluator(): DSLEvaluator {
  if (!evaluator) {
    evaluator = new DSLEvaluator();
  }
  return evaluator;
}

export async function validateAuth(request: Request): Promise<{ valid: boolean; error?: string }> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { valid: false, error: 'Authorization required. Pass a Bearer token.' };
  }

  if (token.startsWith('mna_')) {
    return { valid: true };
  }

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return { valid: true };
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
