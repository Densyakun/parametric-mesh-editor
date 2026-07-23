import { getEvaluator, validateApiKey, jsonResponse, corsResponse } from '../lib/utils';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    if (request.method !== 'GET') {
      return jsonResponse(405, { error: 'Method not allowed' });
    }

    const auth = validateApiKey(request.headers.get('authorization'));
    if (!auth.valid) {
      return jsonResponse(401, { error: auth.error });
    }

    const url = new URL(request.url);
    const name = url.pathname.split('/features/')[1];

    if (!name) {
      return jsonResponse(400, { error: 'Missing feature name' });
    }

    const evaluator = await getEvaluator();
    const schema = evaluator.getFeatureSchema(name);

    if (!schema) {
      return jsonResponse(404, { error: `Feature "${name}" not found` });
    }

    return jsonResponse(200, { schema });
  },
};
