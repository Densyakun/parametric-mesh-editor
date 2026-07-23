const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({
      name: 'MeshNative API',
      version: '0.1.0',
      description: 'REST API for AI agent access to MeshNative parametric modeling',
      endpoints: {
        'GET /api/health': 'Health check',
        'GET /api/docs': 'This documentation',
        'POST /api/evaluate': 'Evaluate DSL code and return mesh data',
        'GET /api/features': 'List all available features',
        'GET /api/features/:name': 'Get feature schema',
        'POST /api/validate': 'Validate DSL code without executing',
      },
      authentication: 'Pass API key as Authorization: Bearer <key>',
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
