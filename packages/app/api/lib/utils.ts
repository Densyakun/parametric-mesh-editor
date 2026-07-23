import { DSLEvaluator } from '@meshnative/core';

let evaluator: DSLEvaluator | null = null;

export function getEvaluator(): DSLEvaluator {
  if (!evaluator) {
    evaluator = new DSLEvaluator();
  }
  return evaluator;
}

export function validateApiKey(authHeader: string | null): { valid: boolean; error?: string } {
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    return { valid: false, error: 'API key required. Pass it as Authorization: Bearer <key>' };
  }

  if (!apiKey.startsWith('mna_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  return { valid: true };
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
