import type { IncomingMessage, ServerResponse } from 'node:http';
import { getEvaluator, validateApiKey, jsonResponse, corsHeaders } from '../lib/utils';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    corsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }

  const auth = validateApiKey(req.headers.authorization);
  if (!auth.valid) {
    jsonResponse(res, 401, { error: auth.error });
    return;
  }

  const evaluator = getEvaluator();
  const features = evaluator.getAIMetadata();
  jsonResponse(res, 200, { features });
}
