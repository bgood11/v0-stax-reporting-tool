import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReportPresets } from '@/lib/report-service';

export async function GET() {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const presets = await getReportPresets(user.id);
    return NextResponse.json({ presets });
  } catch (error: any) {
    console.error('Failed to get presets:', error);
    return NextResponse.json(
      { error: 'Failed to get presets' },
      { status: 500 }
    );
  }
}
