/**
 * BDM Retailer Assignment Service
 *
 * Manages the assignment of retailers to BDM users for row-level security.
 * Only accessible to admin users.
 */

import { createAdminClient } from './supabase/server';

export interface BdmAssignment {
  id: string;
  user_email: string;
  retailer_name: string;
  assigned_at: string;
}

/**
 * Get all retailers assigned to a BDM user
 */
export async function getBdmAssignments(userEmail: string): Promise<BdmAssignment[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bdm_retailer_assignments')
    .select('*')
    .eq('user_email', userEmail)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch BDM assignments:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all BDMs and their retailer assignments
 * Returns a map of user_email -> array of retailer_names
 */
export async function getAllBdmAssignments(): Promise<Record<string, string[]>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bdm_retailer_assignments')
    .select('*')
    .order('user_email, assigned_at');

  if (error) {
    console.error('Failed to fetch all BDM assignments:', error);
    return {};
  }

  const result: Record<string, string[]> = {};
  for (const assignment of data || []) {
    if (!result[assignment.user_email]) {
      result[assignment.user_email] = [];
    }
    result[assignment.user_email].push(assignment.retailer_name);
  }

  return result;
}

/**
 * Assign a retailer to a BDM user
 * If already assigned, this is a no-op (due to UNIQUE constraint)
 */
export async function assignRetailerToBdm(
  userEmail: string,
  retailerName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('bdm_retailer_assignments')
    .insert({
      user_email: userEmail,
      retailer_name: retailerName
    });

  if (error) {
    // Check if it's a unique constraint violation (already assigned)
    if (error.code === '23505') {
      return { success: true }; // Already assigned, treat as success
    }
    console.error('Failed to assign retailer to BDM:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Unassign a retailer from a BDM user
 */
export async function unassignRetailerFromBdm(
  userEmail: string,
  retailerName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('bdm_retailer_assignments')
    .delete()
    .eq('user_email', userEmail)
    .eq('retailer_name', retailerName);

  if (error) {
    console.error('Failed to unassign retailer from BDM:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Bulk assign retailers to a BDM user
 * Replaces all existing assignments for that user
 */
export async function replaceBdmAssignments(
  userEmail: string,
  retailerNames: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Delete existing assignments
  const { error: deleteError } = await supabase
    .from('bdm_retailer_assignments')
    .delete()
    .eq('user_email', userEmail);

  if (deleteError) {
    console.error('Failed to delete existing assignments:', deleteError);
    return { success: false, error: deleteError.message };
  }

  // Insert new assignments
  if (retailerNames.length === 0) {
    return { success: true }; // No retailers to assign
  }

  const assignments = retailerNames.map(retailer => ({
    user_email: userEmail,
    retailer_name: retailer
  }));

  const { error: insertError } = await supabase
    .from('bdm_retailer_assignments')
    .insert(assignments);

  if (insertError) {
    console.error('Failed to insert new assignments:', insertError);
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

/**
 * Get all unique retailer names that have assignments
 * Useful for checking which retailers have BDM access
 */
export async function getAssignedRetailers(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bdm_retailer_assignments')
    .select('retailer_name')
    .order('retailer_name');

  if (error) {
    console.error('Failed to fetch assigned retailers:', error);
    return [];
  }

  // Extract unique retailer names
  return [...new Set((data || []).map(a => a.retailer_name))];
}
