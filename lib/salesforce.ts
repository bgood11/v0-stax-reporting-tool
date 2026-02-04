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

  // Try OAuth2 Client Credentials flow
  // Note: This requires the Connected App in Salesforce to be configured for Client Credentials flow
  const tokenUrl = `${instanceUrl}/services/oauth2/token`;

  try {
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

      // If client_credentials fails, the Connected App may not be configured for it
      // In that case, we need username/password flow
      throw new Error(`Salesforce OAuth failed: ${response.status} - ${errorText}.
        The Connected App may need to be configured for Client Credentials flow,
        or you may need to provide SALESFORCE_USERNAME, SALESFORCE_PASSWORD, and SALESFORCE_SECURITY_TOKEN for username-password flow.`);
    }

    const data = await response.json() as SalesforceTokenResponse;

    // Cache token for 1 hour (Salesforce tokens typically last 2 hours)
    cachedToken = {
      token: data.access_token,
      instanceUrl: data.instance_url || instanceUrl,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };

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
    id: raw['Application Decision Name'] || raw['AD_Name__c'] || raw['Id'],
    ap_number: raw['Application Number'] || raw['AP_Number__c'],
    lender_name: raw['Lender Name'] || raw['Lender__c'],
    bdm_name: raw['BDM Name'] || raw['BDM__c'],
    prime_subprime: raw['Prime/Sub-Prime'] || raw['Prime_SubPrime__c'],
    priority: parseInt(raw['Priority'] || raw['Priority__c'] || '0'),
    parent_company: raw['Parent Company: Company Name'] || raw['Parent_Company__c'],
    retailer_name: raw['Retailer Name'] || raw['Retailer__c'],
    created_date: parseDate(raw['Created Date'] || raw['CreatedDate']),
    approved_date: parseDate(raw['Approved Date'] || raw['Approved_Date__c']),
    referred_date: parseDate(raw['Referred Date'] || raw['Referred_Date__c']),
    rejected_date: parseDate(raw['Rejected Date'] || raw['Rejected_Date__c']),
    contract_signed_date: parseDate(raw['Contract Signed Date'] || raw['Contract_Signed_Date__c']),
    live_date: parseDate(raw['Live Date'] || raw['Live_Date__c']),
    cancelled_date: parseDate(raw['Cancelled Date'] || raw['Cancelled_Date__c']),
    expired_date: parseDate(raw['Expired On'] || raw['Expired_Date__c']),
    purchase_amount: parseFloat(raw['Purchase Amount'] || raw['Purchase_Amount__c'] || '0'),
    deposit_amount: parseFloat(raw['Deposit Amount'] || raw['Deposit_Amount__c'] || '0'),
    loan_amount: parseFloat(raw['Loan Amount'] || raw['Loan_Amount__c'] || '0'),
    commission_amount: parseFloat(raw['Shermin Commission Amount'] || raw['Commission__c'] || '0'),
    goods_description: raw['Goods Description'] || raw['Goods_Description__c'],
    terms_month: parseInt(raw['Terms Month'] || raw['Terms__c'] || '0'),
    apr: parseFloat(raw['APR'] || raw['APR__c'] || '0'),
    finance_product: raw['Finance Product'] || raw['Finance_Product__c'],
    deferral_period: parseInt(raw['Deferral Period'] || raw['Deferral_Period__c'] || '0'),
    derived_status: ''
  };

  record.derived_status = deriveStatus(record);
  return record;
}
