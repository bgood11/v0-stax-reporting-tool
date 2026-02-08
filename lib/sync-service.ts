// Sync service for pulling Salesforce data into Supabase
import { createAdminClient } from './supabase/server';
import type { AuthContext } from './middleware/auth';
import {
  fetchReportData,
  transformRecord,
  fetchAllApplicationDecisions,
  transformSOQLRecord
} from './salesforce';

interface SyncResult {
  success: boolean;
  recordCount?: number;
  error?: string;
  method?: 'soql' | 'report';
}

/**
 * Main sync function - pulls data from Salesforce and stores in Supabase
 * Used by the cron job at 1am daily
 *
 * Strategy: FETCH data FIRST, VALIDATE it looks reasonable, then DELETE old data, then INSERT fresh data
 * This prevents data loss if Salesforce fetch fails or returns suspiciously low counts
 */
export async function syncDataToSupabase(): Promise<SyncResult> {
  const supabase = createAdminClient();

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('sync_log')
    .insert({
      status: 'running',
      records_synced: 0
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to create sync log:', logError);
    // Continue anyway - sync is more important than logging
  }

  const syncLogId = syncLog?.id;

  try {
    console.log('Starting Salesforce data sync to Supabase...');

    // STEP 1: Fetch all data from Salesforce FIRST (before any deletes)
    let rawData: any[];
    let method: 'soql' | 'report' = 'soql';
    let records: any[];

    try {
      rawData = await fetchAllApplicationDecisions();
      console.log(`Fetched ${rawData.length} records from Salesforce via SOQL`);
      records = rawData.map(transformSOQLRecord);
    } catch (soqlError: any) {
      console.error('SOQL fetch failed, falling back to Reports API:', soqlError.message);
      method = 'report';

      rawData = await fetchReportData();
      console.log(`Fetched ${rawData.length} records from Salesforce via Reports API (limited to 2,000)`);

      // Log field names from first record to help debug mapping issues
      if (rawData.length > 0) {
        console.log('Reports API field names:', Object.keys(rawData[0]).join(', '));
      }

      // Transform with index for synthetic ID generation
      records = rawData.map((raw, index) => transformRecord(raw, index));
    }

    console.log(`Transformed ${records.length} records`);

    // STEP 2: Validate records have IDs before proceeding
    const recordsWithNullIds = records.filter(r => !r.id);
    if (recordsWithNullIds.length > 0) {
      console.error(`WARNING: ${recordsWithNullIds.length} records have null IDs. First one:`, recordsWithNullIds[0]);
    }

    // STEP 3: Validate fetched data count is reasonable before deleting existing data
    // Get current record count to compare against fetch
    const { count: currentCount, error: countError } = await supabase
      .from('application_decisions')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Failed to get current record count:', countError);
      throw new Error(`Failed to validate current record count: ${countError.message}`);
    }

    const safeRecordCount = currentCount || 0;
    console.log(`Current record count in database: ${safeRecordCount}`);

    // Safety check: If we previously had records but now we're getting very few, abort
    // This prevents data loss from Salesforce query issues
    if (safeRecordCount > 0 && records.length < safeRecordCount * 0.5) {
      const lossPercentage = ((safeRecordCount - records.length) / safeRecordCount * 100).toFixed(1);
      console.error(`SAFETY CHECK FAILED: Fetched record count (${records.length}) is less than 50% of existing records (${safeRecordCount}). This would cause ${lossPercentage}% data loss. Aborting sync to prevent data loss.`);
      throw new Error(`Fetch validation failed: Record count dropped ${lossPercentage}%. Expected at least ${Math.ceil(safeRecordCount * 0.5)} records, got ${records.length}. Sync aborted to prevent data loss.`);
    }

    // STEP 4: Only after successful fetch and validation, delete existing data
    console.log('Validation passed. Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('application_decisions')
      .delete()
      .neq('id', ''); // Delete all rows

    if (deleteError) {
      throw new Error(`Failed to clear existing data: ${deleteError.message}`);
    }
    console.log('Existing data cleared successfully.');

    // STEP 5: Insert new records in batches (Supabase has limits on batch size)
    // Note: If any batch fails, the error is caught and sync is rolled back
    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      // Map our record format to database schema
      // Filter out any records with null IDs to prevent DB constraint violations
      const dbRecords = batch
        .filter(r => r.id) // Skip records without IDs
        .map(r => ({
          id: r.id,
          ad_name: r.id, // Explicit AD Name column for clarity
          application_number: r.ap_number || null,
          lender_name: r.lender_name || null,
          status: r.derived_status || 'Created',
          submitted_date: r.created_date || null,
          approved_date: r.approved_date || null,
          declined_date: r.rejected_date || null,
          contract_signed_date: r.contract_signed_date || null,
          live_date: r.live_date || null,
          cancelled_date: r.cancelled_date || null,
          expired_date: r.expired_date || null,
          referred_date: r.referred_date || null,
          loan_amount: r.loan_amount || null,
          deposit_amount: r.deposit_amount || null,
          goods_amount: r.purchase_amount || null,
          retailer_name: r.retailer_name || null,
          parent_company: r.parent_company || null,
          bdm_name: r.bdm_name || null,
          finance_product: r.finance_product || null,
          apr: r.apr || null,
          term_months: r.terms_month || null,
          deferral_months: r.deferral_period || null,
          prime_subprime: r.prime_subprime || null,
          priority: r.priority || null,
          commission_amount: r.commission_amount || null,
          synced_at: new Date().toISOString()
        }));

      if (dbRecords.length === 0) {
        console.log(`Skipping batch at ${i} - all records had null IDs`);
        continue;
      }

      const { error: insertError } = await supabase
        .from('application_decisions')
        .insert(dbRecords);

      if (insertError) {
        console.error(`Batch insert failed at offset ${i}:`, insertError);
        console.error('First record in failed batch:', JSON.stringify(dbRecords[0], null, 2));
        // Note: Data was already deleted in STEP 4. This error will be caught by catch block below
        throw new Error(`Failed to insert batch at offset ${i}: ${insertError.message}`);
      }

      insertedCount += dbRecords.length;
      console.log(`Inserted ${insertedCount}/${records.length} records`);
    }

    // Update sync log on success
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          completed_at: new Date().toISOString(),
          status: 'success',
          records_synced: insertedCount
        })
        .eq('id', syncLogId);
    }

    console.log(`Sync completed successfully: ${insertedCount} records (method: ${method})`);

    return { success: true, recordCount: insertedCount, method };

  } catch (error: any) {
    console.error('Sync failed:', error.message);

    // Update sync log with error - include detailed error context
    if (syncLogId) {
      const errorInfo = {
        completed_at: new Date().toISOString(),
        status: 'error',
        error_message: error.message
      };

      await supabase
        .from('sync_log')
        .update(errorInfo)
        .eq('id', syncLogId);
    }

    // Critical: Log that manual recovery may be needed if error occurred after delete
    console.error('SYNC FAILED - Check logs to determine recovery steps');
    console.error('If error occurred after "Existing data cleared successfully", manual data restoration may be required.');

    return { success: false, error: error.message };
  }
}

/**
 * Get the last sync status from the database
 */
export async function getLastSyncStatus() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Failed to get sync status:', error);
    return null;
  }

  return data;
}

/**
 * Get sync history
 */
export async function getSyncHistory(limit: number = 10) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get sync history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get synced application decisions data from Supabase
 * Used for status checks and data samples
 * Optional authContext filters data for BDM users
 */
export async function getSyncedData(limit?: number, authContext?: AuthContext) {
  const supabase = createAdminClient();

  let query = supabase
    .from('application_decisions')
    .select('*')
    .order('submitted_date', { ascending: false });

  // Apply BDM filtering if authContext provided
  if (authContext) {
    if (authContext.hasFullAccess) {
      // Admins or users with "ALL" assignment see all data - no filtering
    } else if (authContext.assignedBdmNames.length > 0) {
      // Users only see data for their assigned BDM names
      query = query.in('bdm_name', authContext.assignedBdmNames);
    } else {
      // No assignments = no data
      query = query.eq('id', 'null-no-access');
    }
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get synced data:', error);
    return [];
  }

  return data || [];
}

// Export with the old name for backward compatibility with the cron job
export { syncDataToSupabase as syncDataToMemory };
