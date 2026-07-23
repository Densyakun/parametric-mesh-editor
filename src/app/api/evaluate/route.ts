import { NextResponse } from 'next/server';
import { getEvaluator, validateAuth, computeBoundingBox, getIndicesFromMesh } from '../lib/utils';

export async function POST(request: Request) {
  const auth = await validateAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body?.dsl) {
      return NextResponse.json({ error: 'Missing "dsl" field in request body' }, { status: 400 });
    }

    const evaluator = getEvaluator();
    const startTime = performance.now();
    const result = await evaluator.evaluate(body.dsl);
    const evaluationTime = performance.now() - startTime;

    return NextResponse.json({
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
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
