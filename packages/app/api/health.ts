import { jsonResponse, corsHeaders } from './lib/utils';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  return jsonResponse(200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
