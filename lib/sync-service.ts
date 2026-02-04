// Sync service for pulling Salesforce data
import db from './db';
import { fetchReportData, transformRecord } from './salesforce';

interface SyncResult {
  success: boolean;
  recordCount?: number;
  error?: string;
}

interface SyncLog {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_synced: number | null;
  error_message: string | null;
}

// In-memory sync log (since we're using in-memory db)
const syncLogs: SyncLog[] = [];

export async function syncData(): Promise<SyncResult> {
  const startTime = new Date().toISOString();
  const syncLogEntry: SyncLog = {
    id: syncLogs.length + 1,
    started_at: startTime,
    completed_at: null,
    status: 'in_progress',
    records_synced: null,
    error_message: null,
  };
  syncLogs.push(syncLogEntry);

  try {
    console.log('Starting Salesforce data sync...');

    // Fetch data from Salesforce
    const rawData = await fetchReportData();
    console.log(`Fetched ${rawData.length} records from Salesforce`);

    // Transform records
    const records = rawData.map(transformRecord);
    console.log(`Transformed ${records.length} records`);

    // Store in the in-memory database
    // For the demo, we'll update the db store directly
    // In production, this would use better-sqlite3

    // Clear existing data and insert new
    const store = (db as any)._getStore?.() || getStoreFromDb();

    if (store && store.application_decisions) {
      // Clear existing
      store.application_decisions.length = 0;

      // Insert new records
      for (const record of records) {
        store.application_decisions.push(record);
      }
    }

    // Update sync log
    syncLogEntry.completed_at = new Date().toISOString();
    syncLogEntry.status = 'success';
    syncLogEntry.records_synced = records.length;

    console.log(`Sync completed successfully: ${records.length} records`);

    return { success: true, recordCount: records.length };

  } catch (error: any) {
    console.error('Sync failed:', error.message);

    // Update sync log with error
    syncLogEntry.completed_at = new Date().toISOString();
    syncLogEntry.status = 'failed';
    syncLogEntry.error_message = error.message;

    return { success: false, error: error.message };
  }
}

export function getLastSyncStatus(): SyncLog | undefined {
  return syncLogs[syncLogs.length - 1];
}

export function getSyncHistory(limit: number = 10): SyncLog[] {
  return syncLogs.slice(-limit).reverse();
}

// Helper to access the in-memory store (since we can't import it directly)
function getStoreFromDb(): any {
  // The db module exports methods that access an internal store
  // We need to add a way to access it for the sync service
  return null;
}

// Alternative: Store synced data in a module-level variable
let syncedApplicationDecisions: any[] = [];

export function getSyncedData(): any[] {
  return syncedApplicationDecisions;
}

export function setSyncedData(data: any[]): void {
  syncedApplicationDecisions = data;
}

// Modified sync that uses module-level storage
export async function syncDataToMemory(): Promise<SyncResult> {
  const startTime = new Date().toISOString();
  const syncLogEntry: SyncLog = {
    id: syncLogs.length + 1,
    started_at: startTime,
    completed_at: null,
    status: 'in_progress',
    records_synced: null,
    error_message: null,
  };
  syncLogs.push(syncLogEntry);

  try {
    console.log('Starting Salesforce data sync...');

    // Fetch data from Salesforce
    const rawData = await fetchReportData();
    console.log(`Fetched ${rawData.length} records from Salesforce`);

    // Transform records
    const records = rawData.map(transformRecord);
    console.log(`Transformed ${records.length} records`);

    // Store in module-level variable
    syncedApplicationDecisions = records;

    // Update sync log
    syncLogEntry.completed_at = new Date().toISOString();
    syncLogEntry.status = 'success';
    syncLogEntry.records_synced = records.length;

    console.log(`Sync completed successfully: ${records.length} records`);

    return { success: true, recordCount: records.length };

  } catch (error: any) {
    console.error('Sync failed:', error.message);

    // Update sync log with error
    syncLogEntry.completed_at = new Date().toISOString();
    syncLogEntry.status = 'failed';
    syncLogEntry.error_message = error.message;

    return { success: false, error: error.message };
  }
}
