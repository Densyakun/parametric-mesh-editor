import { NextResponse } from 'next/server';
import { getSupabase } from '../../lib/utils';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'No token' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: error?.message || 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({ userId: user.id, email: user.email });
}
