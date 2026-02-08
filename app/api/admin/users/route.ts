import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (use admin client to bypass RLS)
    const { data: currentUser } = await adminClient
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

    // Get users with pagination (use admin client to bypass RLS and see all users)
    const { data: users, error, count } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

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

    const body = await request.json();
    const { email, name, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Send magic link invitation first
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email.toLowerCase());

    if (inviteError) {
      console.error('Error sending invite:', inviteError);
      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
    }

    // The profile will be auto-created by the trigger on auth.users
    // But we can optionally fetch it after a short delay or just return the invitation success
    return NextResponse.json({
      message: 'Invitation sent successfully',
      email: email.toLowerCase(),
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
