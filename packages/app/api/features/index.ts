import { getEvaluator, validateApiKey, jsonResponse, corsHeaders } from './lib/utils';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = validateApiKey(request.headers.get('authorization') ?? undefined);
  if (!auth.valid) {
    return jsonResponse(401, { error: auth.error });
  }

  const evaluator = getEvaluator();
  const features = evaluator.getAIMetadata();
  return jsonResponse(200, { features });
}
