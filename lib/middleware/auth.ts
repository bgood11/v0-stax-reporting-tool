/**
 * Auth Middleware for BDM Data Isolation
 *
 * This middleware provides role-based access control and BDM retailer assignment lookup.
 * It's designed to be used in API routes to:
 * 1. Verify user authentication
 * 2. Fetch user profile with role information
 * 3. If BDM: Look up assigned retailers
 * 4. Return a context object for use in data filtering
 */

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export interface AuthContext {
  userId: string;
  userEmail: string;
  role: 'global_admin' | 'admin' | 'bdm' | 'viewer';
  assignedRetailers: string[];
  isAdmin: boolean;
  isBdm: boolean;
}

/**
 * Extract auth context from current request
 * Throws 401 if not authenticated
 * Throws 403 if user profile not found
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();

  // Get the current user from session
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Fetch user profile to get role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  const userProfile = profile as Profile;
  const role = userProfile.role as 'global_admin' | 'admin' | 'bdm' | 'viewer';
  const isAdmin = role === 'global_admin' || role === 'admin';
  const isBdm = role === 'bdm';

  let assignedRetailers: string[] = [];

  // If BDM, fetch their assigned retailers
  if (isBdm) {
    const { data: assignments, error: assignError } = await supabase
      .from('bdm_retailer_assignments')
      .select('retailer_name')
      .eq('user_email', user.email);

    if (assignError) {
      console.error('Failed to fetch BDM retailer assignments:', assignError);
      // Don't throw - BDM with no assignments just gets empty list
    } else {
      assignedRetailers = (assignments || []).map(a => a.retailer_name).filter(Boolean);
    }
  }

  return {
    userId: user.id,
    userEmail: user.email || '',
    role,
    assignedRetailers,
    isAdmin,
    isBdm
  };
}

/**
 * Helper to check if a retailer is accessible to the current user
 * Admins can access all retailers, BDMs can only access assigned ones
 */
export function isRetailerAccessible(
  retailer: string | null,
  authContext: AuthContext
): boolean {
  if (!retailer) return false;
  if (authContext.isAdmin) return true;
  if (authContext.isBdm) {
    return authContext.assignedRetailers.includes(retailer);
  }
  return false;
}

/**
 * Get retailer filter clause for BDM users
 * Returns null for admins (no filtering needed)
 * Returns array of retailers for BDM users
 */
export function getRetailerFilterForUser(authContext: AuthContext): string[] | null {
  if (authContext.isAdmin) {
    return null; // No filtering for admins
  }
  if (authContext.isBdm && authContext.assignedRetailers.length > 0) {
    return authContext.assignedRetailers;
  }
  // BDM with no assignments returns empty list (will return no data)
  return authContext.assignedRetailers;
}
