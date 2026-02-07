/**
 * User BDM Assignments API Route
 *
 * GET - List all user assignments or get available BDM names
 *   ?action=available - Get list of BDM names from data (for UI dropdown)
 *   ?userEmail=xxx - Get assignments for specific user
 *   (no params) - Get all user assignments
 *
 * POST - Assign BDM names to a user (bulk replace)
 *   Body: { userEmail: string, bdmNames: string[] }
 *   Use bdmNames: ["ALL"] for full access
 *
 * SECURITY: Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/middleware/auth';
import {
  getAllUserBdmAssignments,
  replaceUserBdmAssignments,
  getUserBdmAssignments,
  getAvailableBdmNames
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
    const action = request.nextUrl.searchParams.get('action');
    const userEmail = request.nextUrl.searchParams.get('userEmail');

    // Get available BDM names for the dropdown
    if (action === 'available') {
      const bdmNames = await getAvailableBdmNames();
      return NextResponse.json({
        bdmNames: ['ALL', ...bdmNames], // "ALL" option for full access
        count: bdmNames.length
      });
    }

    // Get assignments for specific user
    if (userEmail) {
      const assignments = await getUserBdmAssignments(userEmail);
      const bdmNames = assignments.map(a => a.bdm_name);
      return NextResponse.json({ userEmail, bdmNames, assignments });
    }

    // Get all assignments
    const allAssignments = await getAllUserBdmAssignments();
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

    // Accept both 'bdmNames' (new) and 'retailers' (legacy) for backward compatibility
    const bdmNames = body.bdmNames || body.retailers;

    if (!Array.isArray(bdmNames)) {
      return NextResponse.json(
        { error: 'bdmNames must be an array' },
        { status: 400 }
      );
    }

    // Validate each BDM name
    if (!bdmNames.every((b: any) => typeof b === 'string')) {
      return NextResponse.json(
        { error: 'All BDM names must be strings' },
        { status: 400 }
      );
    }

    // Replace assignments
    const result = await replaceUserBdmAssignments(body.userEmail, bdmNames);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userEmail: body.userEmail,
      bdmNames: bdmNames,
      message: `Updated BDM assignments for ${body.userEmail}`
    });

  } catch (error: any) {
    console.error('Failed to update BDM assignments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update assignments' },
      { status: 500 }
    );
  }
}
