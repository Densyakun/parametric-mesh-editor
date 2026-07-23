import { getEvaluator, validateApiKey, jsonResponse, corsResponse } from './lib/utils';

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

      const evaluator = getEvaluator();
      const result = await evaluator.evaluate(body.dsl);

      return jsonResponse(200, {
        valid: result.errors.length === 0,
        errors: result.errors,
        parameters: result.parameters,
        featureCount: result.features.length,
      });
    } catch (e: any) {
      return jsonResponse(500, { error: e.message || 'Internal server error' });
    }
  },
};
