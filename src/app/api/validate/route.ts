import { NextResponse } from 'next/server';
import { getEvaluator, validateAuth } from '../lib/utils';

export async function POST(request: Request) {
  const auth = await validateAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body?.dsl) {
      return NextResponse.json({ error: 'Missing "dsl" field in request body' }, { status: 400 });
    }

    const evaluator = getEvaluator();
    const result = await evaluator.evaluate(body.dsl);

    return NextResponse.json({
      valid: result.errors.length === 0,
      errors: result.errors,
      parameters: result.parameters,
      featureCount: result.features.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
