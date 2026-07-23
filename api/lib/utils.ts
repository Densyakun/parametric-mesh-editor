import { createRequire } from 'node:module';

let evaluator: any = null;

export async function getEvaluator(): Promise<any> {
  if (!evaluator) {
    const require = createRequire(import.meta.url);
    const { DSLEvaluator } = require('../' + 'dist/core/index.js');
    evaluator = new DSLEvaluator();
  }
  return evaluator;
}

export function validateApiKey(authHeader: string | null): { valid: boolean; error?: string } {
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    return { valid: false, error: 'API key required. Pass it as Authorization: Bearer <key>' };
  }

  if (!apiKey.startsWith('mna_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  return { valid: true };
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function corsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}

export function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
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
