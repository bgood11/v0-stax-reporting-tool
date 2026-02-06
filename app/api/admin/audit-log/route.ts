import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single();

    if (!currentUser || (currentUser.role !== 'global_admin' && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get audit logs - for now, we'll use sync_logs as a proxy
    // In production, you'd have a dedicated audit_logs table
    const { data: syncLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);

    // Get report generation history as audit events
    const { data: reportLogs } = await supabase
      .from('reports')
      .select('id, name, user_id, created_at, users(name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    // Transform into audit log format
    const logs = [
      // Sync logs
      ...(syncLogs || []).map(log => ({
        id: `sync-${log.id}`,
        action: `Data sync ${log.status}`,
        action_type: 'sync' as const,
        user_email: 'system@sherminfinance.co.uk',
        user_name: 'System',
        details: { records_synced: log.records_synced, duration: log.completed_at ? new Date(log.completed_at).getTime() - new Date(log.started_at).getTime() : null },
        created_at: log.started_at,
      })),
      // Report logs
      ...(reportLogs || []).map(log => {
        const userData = log.users as { name: string; email: string } | null;
        return {
          id: `report-${log.id}`,
          action: `Report generated: ${log.name}`,
          action_type: 'report' as const,
          user_email: userData?.email || 'unknown',
          user_name: userData?.name || null,
          details: null,
          created_at: log.created_at,
        };
      }),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Admin audit log API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
