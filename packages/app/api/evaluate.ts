import type { IncomingMessage, ServerResponse } from 'node:http';
import { getEvaluator, validateApiKey, jsonResponse, corsHeaders, computeBoundingBox, getIndicesFromMesh } from './lib/utils';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    corsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }

  const auth = validateApiKey(req.headers.authorization);
  if (!auth.valid) {
    jsonResponse(res, 401, { error: auth.error });
    return;
  }

  try {
    const body = JSON.parse(await readBody(req));
    if (!body?.dsl) {
      jsonResponse(res, 400, { error: 'Missing "dsl" field in request body' });
      return;
    }

    const evaluator = getEvaluator();
    const startTime = performance.now();
    const result = evaluator.evaluate(body.dsl);
    const evaluationTime = performance.now() - startTime;

    jsonResponse(res, 200, {
      success: result.errors.length === 0,
      errors: result.errors,
      parameters: result.parameters,
      features: result.features.map(f => ({
        id: f.id,
        name: f.name,
        parameters: f.parameters,
        hasMesh: f.mesh !== null,
        polygonCount: f.mesh?.faces.firstHalfEdge.length ?? 0,
        vertexCount: f.mesh ? f.mesh.vertexPositions.length / 3 : 0,
      })),
      mesh: result.mesh ? {
        vertexCount: result.mesh.vertexPositions.length / 3,
        faceCount: result.mesh.faces.firstHalfEdge.length,
        edgeCount: result.mesh.edges.firstHalfEdge.length,
        boundingBox: computeBoundingBox(result.mesh.vertexPositions),
        positions: Array.from(result.mesh.vertexPositions),
        normals: Array.from(result.mesh.vertexNormals),
        indices: getIndicesFromMesh(result.mesh),
      } : null,
      evaluationTime: Math.round(evaluationTime * 100) / 100,
    });
  } catch (e: any) {
    jsonResponse(res, 500, { error: e.message || 'Internal server error' });
  }
}
