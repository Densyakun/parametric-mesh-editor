import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsonResponse, corsHeaders } from './lib/utils';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    corsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  jsonResponse(res, 200, {
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
  });
}
