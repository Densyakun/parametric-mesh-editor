import { NextResponse } from 'next/server';
import { getEvaluator, validateAuth } from '../../lib/utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = await validateAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { name } = await params;

  if (!name) {
    return NextResponse.json({ error: 'Missing feature name' }, { status: 400 });
  }

  const evaluator = getEvaluator();
  const schema = evaluator.getFeatureSchema(name);

  if (!schema) {
    return NextResponse.json({ error: `Feature "${name}" not found` }, { status: 404 });
  }

  return NextResponse.json({ schema });
}
