import { getEvaluator, validateApiKey, jsonResponse, corsResponse, computeBoundingBox, getIndicesFromMesh } from './lib/utils';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    if (request.method !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed' });
    }

    const auth = validateApiKey(request.headers.get('authorization'));
    if (!auth.valid) {
      return jsonResponse(401, { error: auth.error });
    }

    try {
      const body = await request.json();
      if (!body?.dsl) {
        return jsonResponse(400, { error: 'Missing "dsl" field in request body' });
      }

      const evaluator = await getEvaluator();
      const startTime = performance.now();
      const result = await evaluator.evaluate(body.dsl);
      const evaluationTime = performance.now() - startTime;

      return jsonResponse(200, {
        success: result.errors.length === 0,
        errors: result.errors,
        parameters: result.parameters,
        features: result.features.map((f: any) => ({
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
      return jsonResponse(500, { error: e.message || 'Internal server error' });
    }
  },
};
