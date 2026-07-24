import { NextResponse } from 'next/server';
import { validateAuth, getSupabase } from '../lib/utils';

export async function GET(request: Request) {
  const auth = await validateAuth(request);
  if (!auth.valid || !auth.userId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('list_projects', { uid: auth.userId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await validateAuth(request);
  if (!auth.valid || !auth.userId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body?.name || !body?.dsl) {
      return NextResponse.json({ error: 'Missing "name" and/or "dsl" fields' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('create_project', {
      uid: auth.userId,
      project_name: body.name,
      project_dsl: body.dsl,
      project_description: body.description ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
