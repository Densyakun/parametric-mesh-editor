import { NextResponse } from 'next/server';
import { getEvaluator, validateAuth } from '../lib/utils';

export async function GET(request: Request) {
  const auth = await validateAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const evaluator = getEvaluator();
  const features = evaluator.getAIMetadata();
  return NextResponse.json({ features });
}
