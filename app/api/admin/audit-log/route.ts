import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || (currentUser.role !== 'global_admin' && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for pagination
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Get audit logs from audit_log table
    const { data: logs, error: logsError, count } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // If audit_log table doesn't exist or is empty, provide fallback
    if (logsError) {
      console.warn('Audit log table query failed:', logsError.message);
      // Return empty logs with proper pagination structure
      return NextResponse.json({
        logs: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Admin audit log API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
