/**
 * User BDM Assignment Service
 *
 * Manages the assignment of BDM names to users for row-level security.
 * Users can only see application data where bdm_name matches their assignments.
 *
 * Key concepts:
 * - Admins: see ALL data (no filtering)
 * - Users with "ALL" assignment: see all data (like Tony Lilley)
 * - Users with specific BDM names: see only that BDM's data (like Kathryn Wilson)
 * - Users with no assignments: see NO data
 */

import { createAdminClient } from './supabase/server';

export interface BdmAssignment {
  id: string;
  user_email: string;
  bdm_name: string;
  assigned_at: string;
}

/**
 * Get all BDM names assigned to a user
 */
export async function getUserBdmAssignments(userEmail: string): Promise<BdmAssignment[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_bdm_assignments')
    .select('*')
    .eq('user_email', userEmail)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user BDM assignments:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all users and their BDM assignments
 * Returns a map of user_email -> array of bdm_names
 */
export async function getAllUserBdmAssignments(): Promise<Record<string, string[]>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_bdm_assignments')
    .select('*')
    .order('user_email, assigned_at');

  if (error) {
    console.error('Failed to fetch all user BDM assignments:', error);
    return {};
  }

  const result: Record<string, string[]> = {};
  for (const assignment of data || []) {
    if (!result[assignment.user_email]) {
      result[assignment.user_email] = [];
    }
    result[assignment.user_email].push(assignment.bdm_name);
  }

  return result;
}

/**
 * Get distinct BDM names from application_decisions
 * These are the BDM names that can be assigned to users
 */
export async function getAvailableBdmNames(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('application_decisions')
    .select('bdm_name')
    .not('bdm_name', 'is', null)
    .order('bdm_name');

  if (error) {
    console.error('Failed to fetch available BDM names:', error);
    return [];
  }

  // Extract unique, non-empty BDM names
  const uniqueBdms = [...new Set(
    (data || [])
      .map(d => d.bdm_name)
      .filter(Boolean)
  )];

  return uniqueBdms;
}

/**
 * Assign a BDM name to a user
 * If already assigned, this is a no-op (due to UNIQUE constraint)
 */
export async function assignBdmToUser(
  userEmail: string,
  bdmName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('user_bdm_assignments')
    .insert({
      user_email: userEmail,
      bdm_name: bdmName
    });

  if (error) {
    // Check if it's a unique constraint violation (already assigned)
    if (error.code === '23505') {
      return { success: true }; // Already assigned, treat as success
    }
    console.error('Failed to assign BDM to user:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Unassign a BDM name from a user
 */
export async function unassignBdmFromUser(
  userEmail: string,
  bdmName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('user_bdm_assignments')
    .delete()
    .eq('user_email', userEmail)
    .eq('bdm_name', bdmName);

  if (error) {
    console.error('Failed to unassign BDM from user:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Bulk assign BDM names to a user
 * Replaces all existing assignments for that user
 *
 * @param userEmail - User's email address
 * @param bdmNames - Array of BDM names to assign. Use ["ALL"] for full access.
 */
export async function replaceUserBdmAssignments(
  userEmail: string,
  bdmNames: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Delete existing assignments
  const { error: deleteError } = await supabase
    .from('user_bdm_assignments')
    .delete()
    .eq('user_email', userEmail);

  if (deleteError) {
    console.error('Failed to delete existing assignments:', deleteError);
    return { success: false, error: deleteError.message };
  }

  // Insert new assignments
  if (bdmNames.length === 0) {
    return { success: true }; // No BDMs to assign
  }

  const assignments = bdmNames.map(bdm => ({
    user_email: userEmail,
    bdm_name: bdm
  }));

  const { error: insertError } = await supabase
    .from('user_bdm_assignments')
    .insert(assignments);

  if (insertError) {
    console.error('Failed to insert new assignments:', insertError);
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

/**
 * Check if user has "ALL" assignment (full access)
 */
export async function hasFullAccess(userEmail: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_bdm_assignments')
    .select('id')
    .eq('user_email', userEmail)
    .eq('bdm_name', 'ALL')
    .single();

  if (error) {
    return false;
  }

  return !!data;
}

// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================
// These maintain compatibility with existing code during migration

export const getBdmAssignments = getUserBdmAssignments;
export const getAllBdmAssignments = getAllUserBdmAssignments;
export const replaceBdmAssignments = replaceUserBdmAssignments;
