// Salesforce connection and data fetching
// Uses OAuth2 with Consumer Key/Secret

interface SalesforceTokenResponse {
  access_token: string;
  instance_url: string;
  token_type: string;
  issued_at: string;
}

interface ReportResponse {
  factMap: Record<string, { rows?: Array<{ dataCells: Array<{ value: any }> }> }>;
  reportMetadata: {
    detailColumns: string[];
  };
}

let cachedToken: { token: string; instanceUrl: string; expiresAt: number } | null = null;

export async function getSalesforceAccessToken(): Promise<{ token: string; instanceUrl: string }> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return { token: cachedToken.token, instanceUrl: cachedToken.instanceUrl };
  }

  const clientId = process.env.SF_CLIENT_ID || process.env.SALESFORCE_CONSUMER_KEY;
  const clientSecret = process.env.SF_CLIENT_SECRET || process.env.SALESFORCE_CONSUMER_SECRET;
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || 'https://sherminmax.my.salesforce.com';

  if (!clientId || !clientSecret) {
    throw new Error('Missing Salesforce credentials: SF_CLIENT_ID and SF_CLIENT_SECRET are required');
  }

  // Client Credentials Flow uses the My Domain URL for token requests
  const tokenUrl = `${instanceUrl}/services/oauth2/token`;

  try {
    console.log('Using Client Credentials OAuth flow');
    console.log('Token URL:', tokenUrl);

    // Client Credentials Flow - simplest server-to-server auth
    // The "Run As" user is configured in Salesforce Connected App settings
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Salesforce OAuth error:', errorText);
      throw new Error(`Salesforce OAuth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as SalesforceTokenResponse;

    // Cache token for 1 hour (Salesforce tokens typically last 2 hours)
    cachedToken = {
      token: data.access_token,
      instanceUrl: data.instance_url || instanceUrl,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };

    console.log('Successfully obtained Salesforce access token');
    return { token: cachedToken.token, instanceUrl: cachedToken.instanceUrl };
  } catch (error: any) {
    console.error('Failed to get Salesforce access token:', error.message);
    throw error;
  }
}

export async function fetchReportData(): Promise<any[]> {
  const reportId = process.env.SALESFORCE_REPORT_ID;

  if (!reportId) {
    throw new Error('Missing SALESFORCE_REPORT_ID environment variable');
  }

  const { token, instanceUrl } = await getSalesforceAccessToken();

  const reportUrl = `${instanceUrl}/services/data/v59.0/analytics/reports/${reportId}?includeDetails=true`;

  const response = await fetch(reportUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Salesforce report: ${response.status} - ${errorText}`);
  }

  const report = await response.json() as ReportResponse;

  // Parse report data
  const factMap = report.factMap;
  const columns = report.reportMetadata.detailColumns;
  const rows: any[] = [];

  // Extract rows from fact map
  for (const key in factMap) {
    if (factMap[key].rows) {
      factMap[key].rows!.forEach((row) => {
        const record: any = {};
        row.dataCells.forEach((cell, index) => {
          const columnName = columns[index];
          record[columnName] = cell.value;
        });
        rows.push(record);
      });
    }
  }

  return rows;
}

export function deriveStatus(record: any): string {
  // Status hierarchy (highest priority first)
  if (record.cancelled_date) return 'Cancelled';
  if (record.expired_date) return 'Expired';
  if (record.live_date) return 'Live';
  if (record.contract_signed_date) return 'Executed';
  if (record.approved_date) return 'Approved';
  if (record.rejected_date && !record.approved_date) return 'Declined';
  if (record.referred_date && !record.approved_date && !record.rejected_date) return 'Referred';
  return 'Created';
}

export function parseDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // Handle DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

export function transformRecord(raw: any): any {
  const record = {
    id: raw['Application Decision Name'] || raw['AD_Name__c'] || raw['Name'] || raw['Id'],
    ap_number: raw['Application Number'] || raw['AP_Number__c'],
    lender_name: raw['Lender Name'] || raw['Lender__c'],
    bdm_name: raw['BDM Name'] || raw['BDM__c'],
    prime_subprime: raw['Prime/Sub-Prime'] || raw['Prime_SubPrime__c'],
    priority: parseInt(raw['Priority'] || raw['Priority__c'] || '0'),
    parent_company: raw['Parent Company: Company Name'] || raw['Parent_Company__c'],
    retailer_name: raw['Retailer Name'] || raw['Retailer__c'],
    created_date: parseDate(raw['Created Date'] || raw['CreatedDate']),
    approved_date: parseDate(raw['Approved Date'] || raw['Approved_Date__c'] || raw['Accepted_Date__c']),
    referred_date: parseDate(raw['Referred Date'] || raw['Referred_Date__c']),
    rejected_date: parseDate(raw['Rejected Date'] || raw['Rejected_Date__c']),
    contract_signed_date: parseDate(raw['Contract Signed Date'] || raw['Contract_Signed_Date__c']),
    live_date: parseDate(raw['Live Date'] || raw['Live_Date__c']),
    cancelled_date: parseDate(raw['Cancelled Date'] || raw['Cancelled_Date__c']),
    expired_date: parseDate(raw['Expired On'] || raw['Expired_Date__c']),
    purchase_amount: parseFloat(raw['Purchase Amount'] || raw['Purchase_Amount__c'] || '0'),
    deposit_amount: parseFloat(raw['Deposit Amount'] || raw['Deposit_Amount__c'] || '0'),
    loan_amount: parseFloat(raw['Loan Amount'] || raw['Loan_Amount__c'] || '0'),
    commission_amount: parseFloat(raw['Shermin Commission Amount'] || raw['Commission__c'] || raw['Shermin_Commission__c'] || '0'),
    goods_description: raw['Goods Description'] || raw['Goods_Description__c'],
    terms_month: parseInt(raw['Terms Month'] || raw['Terms__c'] || raw['Term_Months__c'] || '0'),
    apr: parseFloat(raw['APR'] || raw['APR__c'] || '0'),
    finance_product: raw['Finance Product'] || raw['Finance_Product__c'],
    deferral_period: parseInt(raw['Deferral Period'] || raw['Deferral_Period__c'] || '0'),
    derived_status: ''
  };

  record.derived_status = deriveStatus(record);
  return record;
}

// ===========================================================================
// SOQL-BASED DATA FETCHING (No 2,000 row limit - uses pagination)
// ===========================================================================

interface SOQLQueryResponse {
  done: boolean;
  nextRecordsUrl?: string;
  totalSize: number;
  records: any[];
}

/**
 * Execute a SOQL query with automatic pagination
 * Handles Salesforce's query limits by following nextRecordsUrl
 */
export async function executeSOQL(query: string): Promise<any[]> {
  const { token, instanceUrl } = await getSalesforceAccessToken();

  const allRecords: any[] = [];
  let url = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(query)}`;
  let batchCount = 0;

  while (url) {
    batchCount++;
    console.log(`Fetching SOQL batch ${batchCount}...`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SOQL query failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as SOQLQueryResponse;
    allRecords.push(...data.records);

    console.log(`Batch ${batchCount}: Got ${data.records.length} records (Total: ${allRecords.length}/${data.totalSize})`);

    // Continue if there are more records
    if (data.done) {
      url = '';
    } else if (data.nextRecordsUrl) {
      url = `${instanceUrl}${data.nextRecordsUrl}`;
    } else {
      url = '';
    }
  }

  console.log(`SOQL query complete: ${allRecords.length} total records`);
  return allRecords;
}

/**
 * Fetch all Application Decision records using SOQL
 * This bypasses the 2,000 row Reports API limit
 *
 * Based on the data model from 03-SALESFORCE-QUERIES.md:
 * - Primary object: Application_Decision__c
 * - Related objects: Lender (Account), Application__c, Opportunity, Retailer Account
 */
export async function fetchAllApplicationDecisions(): Promise<any[]> {
  // SOQL query with VERIFIED field names from Salesforce describe API
  // Note: Keeping query simple to avoid deep relationship traversal issues
  const soqlQuery = `
    SELECT
      Id,
      Name,
      CreatedDate,
      Active__c,

      /* Lender info - direct on AD */
      Lender__c,
      Lender__r.Name,
      Lender_Name__c,

      /* Retailer info - direct on AD */
      Retailer__c,
      Retailer__r.Name,
      Retailer__r.Parent.Name,

      /* BDM info - CONFIRMED field name */
      BDM_Name__c,

      /* Waterfall position */
      Priority__c,
      Prime_Sub_Prime__c,

      /* Status dates - VERIFIED field names */
      Accepted_Date__c,
      Referred_Date__c,
      Approved_Declined_Date__c,
      Contract_Signed_Date__c,
      Paid_Out_Date__c,
      Cancelled_Date__c,
      Expired_On__c,

      /* Financial values on AD */
      Loan_Amount__c,
      Purchase_Amount__c,
      Shermin_Commission_Amount__c,

      /* Product info on AD */
      Product_Name__c,

      /* Related Application info */
      Application__c,
      Application__r.Name,
      Application__r.Application_Number__c,
      Application__r.APR__c,
      Application__r.Terms_Month__c,
      Application__r.Deferral_Period__c,
      Application__r.Goods_Description__c,
      Application__r.Deposit_Amount__c

    FROM Application_Decision__c
    WHERE Active__c = true
    ORDER BY CreatedDate DESC
  `;

  try {
    console.log('Fetching Application Decisions via SOQL...');
    const records = await executeSOQL(soqlQuery);
    return records;
  } catch (error: any) {
    console.error('SOQL fetch failed:', error.message);

    // If the query fails (likely due to field name issues), try a simpler query first
    // to at least get basic data and log what fields are available
    if (error.message.includes('No such column') || error.message.includes('Invalid field')) {
      console.log('Field name error - attempting to discover correct field names...');
      throw new Error(`SOQL field error: ${error.message}. Please run /api/salesforce/describe to get correct field names.`);
    }

    throw error;
  }
}

/**
 * Transform SOQL record (flattened from nested structure) to our internal format
 */
export function transformSOQLRecord(raw: any): any {
  // Handle nested relationship fields from SOQL - VERIFIED field paths
  // Lender: direct on AD
  const lenderName = raw.Lender__r?.Name || raw.Lender_Name__c || raw.Lender__c || '';

  // Retailer: direct on AD via Retailer__r
  const retailerName = raw.Retailer__r?.Name || '';
  const parentCompany = raw.Retailer__r?.Parent?.Name || '';

  // Application Number: from Application__r
  const appNumber = raw.Application__r?.Application_Number__c || raw.Application__r?.Name || '';

  // BDM: Direct field on Application_Decision__c
  const bdmName = raw.BDM_Name__c || '';

  // Commission: Direct field on Application_Decision__c
  const commissionAmount = parseFloat(raw.Shermin_Commission_Amount__c || '0') || 0;

  // Fields from Application__r
  const apr = raw.Application__r?.APR__c || 0;
  const termsMonth = raw.Application__r?.Terms_Month__c || 0;
  const deferralPeriod = raw.Application__r?.Deferral_Period__c || 0;
  const goodsDescription = raw.Application__r?.Goods_Description__c || '';
  const depositAmount = raw.Application__r?.Deposit_Amount__c || 0;

  const record = {
    id: raw.Name || raw.Id,
    ap_number: appNumber,
    lender_name: lenderName,
    bdm_name: bdmName,
    prime_subprime: raw.Prime_Sub_Prime__c || '',
    priority: parseInt(raw.Priority__c || '0') || 0,
    parent_company: parentCompany,
    retailer_name: retailerName,
    created_date: formatSalesforceDate(raw.CreatedDate),
    approved_date: formatSalesforceDate(raw.Accepted_Date__c),
    referred_date: formatSalesforceDate(raw.Referred_Date__c),
    rejected_date: formatSalesforceDate(raw.Approved_Declined_Date__c),
    contract_signed_date: formatSalesforceDate(raw.Contract_Signed_Date__c),
    live_date: formatSalesforceDate(raw.Paid_Out_Date__c),
    cancelled_date: formatSalesforceDate(raw.Cancelled_Date__c),
    expired_date: formatSalesforceDate(raw.Expired_On__c),
    purchase_amount: parseFloat(raw.Purchase_Amount__c || '0') || 0,
    deposit_amount: parseFloat(depositAmount || '0') || 0,
    loan_amount: parseFloat(raw.Loan_Amount__c || '0') || 0,
    commission_amount: commissionAmount,
    goods_description: goodsDescription,
    terms_month: parseInt(termsMonth || '0') || 0,
    apr: parseFloat(apr || '0') || 0,
    finance_product: raw.Product_Name__c || '',
    deferral_period: parseInt(deferralPeriod || '0') || 0,
    derived_status: ''
  };

  record.derived_status = deriveStatus(record);
  return record;
}

/**
 * Format Salesforce datetime to YYYY-MM-DD
 */
function formatSalesforceDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  // Salesforce returns ISO format: 2024-01-15T00:00:00.000+0000
  // Extract just the date part
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  // Handle DD/MM/YYYY format (from reports)
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  return dateStr;
}
