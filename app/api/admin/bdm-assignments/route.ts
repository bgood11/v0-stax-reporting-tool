/**
 * BDM Retailer Assignments API Route
 *
 * GET - List all BDM assignments
 * POST - Assign a retailer to a BDM (bulk upsert)
 *
 * SECURITY: Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/middleware/auth';
import {
  getAllBdmAssignments,
  replaceBdmAssignments,
  getBdmAssignments
} from '@/lib/bdm-assignment-service';

export async function GET(request: NextRequest) {
  // Verify auth and check admin role
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let authContext;
  try {
    authContext = await getAuthContext();
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  // Check admin role
  if (!authContext.isAdmin) {
    return NextResponse.json(
      { error: 'Only admins can view BDM assignments' },
      { status: 403 }
    );
  }

  try {
    // Optional: filter by specific user email
    const userEmail = request.nextUrl.searchParams.get('userEmail');

    if (userEmail) {
      const assignments = await getBdmAssignments(userEmail);
      return NextResponse.json({ userEmail, assignments });
    }

    // Get all assignments
    const allAssignments = await getAllBdmAssignments();
    return NextResponse.json(allAssignments);
  } catch (error: any) {
    console.error('Failed to get BDM assignments:', error);
    return NextResponse.json(
      { error: 'Failed to get BDM assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify auth and check admin role
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let authContext;
  try {
    authContext = await getAuthContext();
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  // Check admin role
  if (!authContext.isAdmin) {
    return NextResponse.json(
      { error: 'Only admins can modify BDM assignments' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate request body
    if (!body.userEmail || typeof body.userEmail !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userEmail' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.retailers)) {
      return NextResponse.json(
        { error: 'retailers must be an array' },
        { status: 400 }
      );
    }

    // Validate each retailer name
    if (!body.retailers.every((r: any) => typeof r === 'string')) {
      return NextResponse.json(
        { error: 'All retailer names must be strings' },
        { status: 400 }
      );
    }

    // Replace assignments
    const result = await replaceBdmAssignments(body.userEmail, body.retailers);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userEmail: body.userEmail,
      retailers: body.retailers,
      message: `Updated assignments for ${body.userEmail}`
    });
  } catch (error: any) {
    console.error('Failed to update BDM assignments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update assignments' },
      { status: 500 }
    );
  }
}
