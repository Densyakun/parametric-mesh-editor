export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    return new Response(JSON.stringify({
      name: 'Parametric Mesh Editor API',
      version: '0.1.0',
      endpoints: {
        health: { method: 'GET', auth: false },
        docs: { method: 'GET', auth: false },
        features: { method: 'GET', auth: true },
        evaluate: { method: 'POST', auth: true, body: '{ dsl: string }' },
        validate: { method: 'POST', auth: true, body: '{ dsl: string }' },
      },
      authentication: 'Bearer token via Authorization header',
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },
};
