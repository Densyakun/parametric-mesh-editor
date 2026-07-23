import { validateApiKey, jsonResponse, corsResponse } from './lib/utils';
import { DSLEvaluator } from '../src/core/index.ts';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    const auth = validateApiKey(request.headers.get('authorization'));
    if (!auth.valid) {
      return jsonResponse(401, { error: auth.error });
    }

    try {
      const evaluator = new DSLEvaluator();
      const result = await evaluator.evaluate('<Model><Box width={1} height={1} depth={1} /></Model>');
      return jsonResponse(200, {
        success: true,
        featureCount: result.features.length,
        hasMesh: !!result.mesh,
      });
    } catch (e: any) {
      return jsonResponse(500, {
        error: e.message,
        name: e.name,
        code: e.code,
      });
    }
  },
};
