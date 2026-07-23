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
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
