import type { IncomingMessage, ServerResponse } from 'node:http';
import { getEvaluator, validateApiKey, jsonResponse, corsHeaders } from './lib/utils';

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    corsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }

  const auth = validateApiKey(req.headers.authorization);
  if (!auth.valid) {
    jsonResponse(res, 401, { error: auth.error });
    return;
  }

  try {
    const body = JSON.parse(await readBody(req));
    if (!body?.dsl) {
      jsonResponse(res, 400, { error: 'Missing "dsl" field in request body' });
      return;
    }

    const evaluator = getEvaluator();
    const result = evaluator.evaluate(body.dsl);

    jsonResponse(res, 200, {
      valid: result.errors.length === 0,
      errors: result.errors,
      parameters: result.parameters,
      featureCount: result.features.length,
    });
  } catch (e: any) {
    jsonResponse(res, 500, { error: e.message || 'Internal server error' });
  }
}
