import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get preset by ID - user can access their own or built-in presets
    const { data: preset, error } = await supabase
      .from('report_presets')
      .select('*')
      .eq('id', id)
      .or(`user_id.eq.${user.id},is_built_in.eq.true`)
      .single();

    if (error || !preset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ preset });
  } catch (error: any) {
    console.error('Failed to get preset:', error);
    return NextResponse.json(
      { error: 'Failed to get preset' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Delete preset - only allow deleting own presets (not built-in)
    const { error } = await supabase
      .from('report_presets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_built_in', false);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete preset' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete preset:', error);
    return NextResponse.json(
      { error: 'Failed to delete preset' },
      { status: 500 }
    );
  }
}
