/**
 * Auth Middleware for User Data Isolation
 *
 * This middleware provides role-based access control and BDM name assignment lookup.
 * Users can be assigned specific BDM names to filter what data they see.
 *
 * Access levels:
 * - global_admin/admin: See ALL data (no filtering)
 * - Users with "ALL" BDM assignment: See all data (e.g., Tony Lilley)
 * - Users with specific BDM names: See only data for those BDMs (e.g., Kathryn Wilson)
 * - Users with no assignments: See NO data
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export interface AuthContext {
  userId: string;
  userEmail: string;
  role: 'global_admin' | 'admin' | 'bdm' | 'viewer';
  assignedBdmNames: string[];  // BDM names this user can see
  hasFullAccess: boolean;      // True if admin OR has "ALL" assignment
  isAdmin: boolean;
  isBdm: boolean;
  // Legacy field for backward compatibility
  assignedRetailers: string[];
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

  // Use admin client to bypass RLS for profile operations
  const adminClient = createAdminClient();

  // Fetch user profile to get role (using admin client to bypass RLS)
  let { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Auto-create profile if it doesn't exist (first login)
  if (profileError || !profile) {
    console.log('Profile not found for user, creating default profile:', user.email);

    // Create default profile with viewer role (adminClient already created above)
    const { data: newProfile, error: createError } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'viewer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError || !newProfile) {
      console.error('Failed to create user profile:', createError);
      throw new Error('User profile not found and could not be created');
    }

    profile = newProfile;
  }

  const userProfile = profile as Profile;
  const role = userProfile.role as 'global_admin' | 'admin' | 'bdm' | 'viewer';
  const isAdmin = role === 'global_admin' || role === 'admin';
  const isBdm = role === 'bdm';

  let assignedBdmNames: string[] = [];
  let hasFullAccess = isAdmin; // Admins always have full access

  // Fetch BDM assignments for non-admin users
  if (!isAdmin) {
    const { data: assignments, error: assignError } = await supabase
      .from('user_bdm_assignments')
      .select('bdm_name')
      .eq('user_email', user.email);

    if (assignError) {
      console.error('Failed to fetch user BDM assignments:', assignError);
      // Don't throw - user with no assignments just gets empty list
    } else {
      assignedBdmNames = (assignments || []).map(a => a.bdm_name).filter(Boolean);

      // Check if user has "ALL" assignment
      if (assignedBdmNames.includes('ALL')) {
        hasFullAccess = true;
      }
    }
  }

  return {
    userId: user.id,
    userEmail: user.email || '',
    role,
    assignedBdmNames,
    hasFullAccess,
    isAdmin,
    isBdm,
    // Legacy compatibility - empty for now as we filter by BDM name
    assignedRetailers: []
  };
}

/**
 * Helper to check if a BDM's data is accessible to the current user
 */
export function isBdmAccessible(
  bdmName: string | null,
  authContext: AuthContext
): boolean {
  if (!bdmName) return false;
  if (authContext.hasFullAccess) return true;
  return authContext.assignedBdmNames.includes(bdmName);
}

/**
 * Get BDM name filter for queries
 * Returns null if user has full access (no filtering needed)
 * Returns array of BDM names to filter by otherwise
 */
export function getBdmFilterForUser(authContext: AuthContext): string[] | null {
  if (authContext.hasFullAccess) {
    return null; // No filtering for admins or users with "ALL" access
  }

  // Return assigned BDM names (may be empty, which means no data)
  return authContext.assignedBdmNames;
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

/**
 * @deprecated Use isBdmAccessible instead
 */
export function isRetailerAccessible(
  retailer: string | null,
  authContext: AuthContext
): boolean {
  // For backward compatibility, check BDM names
  return isBdmAccessible(retailer, authContext);
}

/**
 * @deprecated Use getBdmFilterForUser instead
 */
export function getRetailerFilterForUser(authContext: AuthContext): string[] | null {
  return getBdmFilterForUser(authContext);
}
