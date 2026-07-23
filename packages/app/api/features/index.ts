import { getEvaluator, validateApiKey, jsonResponse, corsResponse } from '../lib/utils';

export default {
  fetch(request: Request): Response {
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

    const evaluator = getEvaluator();
    const features = evaluator.getAIMetadata();
    return jsonResponse(200, { features });
  },
};
