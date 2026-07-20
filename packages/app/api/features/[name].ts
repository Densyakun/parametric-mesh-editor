import { getEvaluator, validateApiKey, jsonResponse, corsHeaders } from '../lib/utils';

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

  const url = new URL(request.url);
  const name = url.pathname.split('/features/')[1];
  
  if (!name) {
    return jsonResponse(400, { error: 'Missing feature name' });
  }

  const evaluator = getEvaluator();
  const schema = evaluator.getFeatureSchema(name);
  
  if (!schema) {
    return jsonResponse(404, { error: `Feature "${name}" not found` });
  }

  return jsonResponse(200, { schema });
}
