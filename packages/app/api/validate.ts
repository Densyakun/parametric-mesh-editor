import { getEvaluator, validateApiKey, jsonResponse, corsHeaders } from './lib/utils';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = validateApiKey(request.headers.get('authorization') ?? undefined);
  if (!auth.valid) {
    return jsonResponse(401, { error: auth.error });
  }

  try {
    const body = await request.json();
    if (!body?.dsl) {
      return jsonResponse(400, { error: 'Missing "dsl" field in request body' });
    }

    const evaluator = getEvaluator();
    const result = evaluator.evaluate(body.dsl);
    
    return jsonResponse(200, {
      valid: result.errors.length === 0,
      errors: result.errors,
      parameters: result.parameters,
      featureCount: result.features.length,
    });
  } catch (e: any) {
    return jsonResponse(500, { error: e.message || 'Internal server error' });
  }
}
