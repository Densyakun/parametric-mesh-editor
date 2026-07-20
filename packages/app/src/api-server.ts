import http from 'node:http';
import { DSLEvaluator, type DSLResult } from '@meshnative/core';

const PORT = 3001;
const evaluator = new DSLEvaluator();

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res: http.ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data, null, 2));
}

function computeBoundingBox(positions: Float32Array): { min: number[]; max: number[] } {
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

function getIndicesFromMesh(mesh: any): number[] {
  const indices: number[] = [];
  for (let f = 0; f < mesh.faces.firstHalfEdge.length; f++) {
    const he = mesh.faces.firstHalfEdge[f];
    indices.push(mesh.halfEdges.origin[he]);
    indices.push(mesh.halfEdges.origin[mesh.halfEdges.next[he]]);
    indices.push(mesh.halfEdges.origin[mesh.halfEdges.next[mesh.halfEdges.next[he]]]);
  }
  return indices;
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const authHeader = req.headers.authorization;
  const apiKey = authHeader?.replace('Bearer ', '');

  if (path !== '/api/docs' && path !== '/api/health') {
    if (!apiKey) {
      sendJSON(res, 401, { error: 'API key required' });
      return;
    }
    if (!apiKey.startsWith('mna_')) {
      sendJSON(res, 403, { error: 'Invalid API key format' });
      return;
    }
  }

  try {
    if (path === '/api/health' && method === 'GET') {
      sendJSON(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    }
    else if (path === '/api/docs' && method === 'GET') {
      sendJSON(res, 200, {
        name: 'MeshNative API',
        version: '0.1.0',
        endpoints: {
          'GET /api/health': 'Health check',
          'GET /api/docs': 'Documentation',
          'POST /api/evaluate': 'Evaluate DSL code',
          'GET /api/features': 'List features',
          'GET /api/features/:name': 'Get feature schema',
          'POST /api/validate': 'Validate DSL code',
        },
      });
    }
    else if (path === '/api/evaluate' && method === 'POST') {
      const body = await parseBody(req);
      if (!body?.dsl) {
        sendJSON(res, 400, { error: 'Missing "dsl" field' });
        return;
      }
      const startTime = performance.now();
      const result: DSLResult = await evaluator.evaluate(body.dsl);
      const evaluationTime = performance.now() - startTime;
      sendJSON(res, 200, {
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
    }
    else if (path === '/api/features' && method === 'GET') {
      sendJSON(res, 200, { features: evaluator.getAIMetadata() });
    }
    else if (path.startsWith('/api/features/') && method === 'GET') {
      const name = path.split('/api/features/')[1];
      const schema = evaluator.getFeatureSchema(name);
      if (!schema) {
        sendJSON(res, 404, { error: `Feature "${name}" not found` });
        return;
      }
      sendJSON(res, 200, { schema });
    }
    else if (path === '/api/validate' && method === 'POST') {
      const body = await parseBody(req);
      if (!body?.dsl) {
        sendJSON(res, 400, { error: 'Missing "dsl" field' });
        return;
      }
      const result = await evaluator.evaluate(body.dsl);
      sendJSON(res, 200, {
        valid: result.errors.length === 0,
        errors: result.errors,
        parameters: result.parameters,
        featureCount: result.features.length,
      });
    }
    else {
      sendJSON(res, 404, { error: 'Not found' });
    }
  } catch (e: any) {
    sendJSON(res, 500, { error: e.message || 'Internal server error' });
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`API server: http://localhost:${PORT}`);
});
