import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardStats } from '@/lib/report-service';
import { getAuthContext } from '@/lib/middleware/auth';

export async function GET() {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get auth context for BDM data filtering
  let authContext;
  try {
    authContext = await getAuthContext();
  } catch (contextError: any) {
    return NextResponse.json({ error: contextError.message }, { status: 403 });
  }

  try {
    const stats = await getDashboardStats(authContext);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}
