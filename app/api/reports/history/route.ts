import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReportHistory } from '@/lib/report-service';

export async function GET(request: NextRequest) {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const history = await getReportHistory(user.id, limit);
    return NextResponse.json({ reports: history });
  } catch (error: any) {
    console.error('Failed to get report history:', error);
    return NextResponse.json(
      { error: 'Failed to get report history' },
      { status: 500 }
    );
  }
}
