// Database types for Stax Reporting Tool

export interface ApplicationDecision {
  id: string
  application_number: string | null
  lender_name: string | null
  status: string | null
  submitted_date: string | null
  approved_date: string | null
  declined_date: string | null
  contract_signed_date: string | null
  live_date: string | null
  cancelled_date: string | null
  expired_date: string | null
  referred_date: string | null
  loan_amount: number | null
  deposit_amount: number | null
  goods_amount: number | null
  retailer_name: string | null
  parent_company: string | null
  bdm_name: string | null
  finance_product: string | null
  apr: number | null
  term_months: number | null
  deferral_months: number | null
  prime_subprime: 'Prime' | 'Sub-Prime' | null
  priority: number | null
  commission_amount: number | null
  synced_at: string
}

export interface Profile {
  id: string
  email: string
  name: string | null
  role: 'global_admin' | 'admin' | 'bdm' | 'viewer'
  created_at: string
  updated_at: string
}

export interface ReportPreset {
  id: string
  user_id: string | null
  name: string
  description: string | null
  config: ReportConfig
  is_built_in: boolean
  created_at: string
  updated_at: string
}

export interface GeneratedReport {
  id: string
  user_id: string
  preset_id: string | null
  name: string | null
  config: ReportConfig
  result_summary: ReportSummary | null
  record_count: number | null
  created_at: string
}

export interface SyncLog {
  id: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'success' | 'error'
  records_synced: number
  error_message: string | null
}

// Report configuration types
export interface ReportConfig {
  reportType: 'AP' | 'AD'
  filters: ReportFilters
  groupBy: string[]
  metrics: string[]
  sortBy?: { field: string; direction: 'asc' | 'desc' }
}

export interface ReportFilters {
  dateRange?: { start: string; end: string }
  lenders?: string[]
  statuses?: string[]
  retailers?: string[]
  bdms?: string[]
  financeProducts?: string[]
  primeSubprime?: ('Prime' | 'Sub-Prime')[]
}

export interface ReportSummary {
  totalRecords: number
  totalLoanValue: number
  totalCommission: number
  approvalRate: number
  executionRate: number
}

// API response types
export interface ReportResult {
  data: ReportRow[]
  summary: ReportSummary
  config: ReportConfig
  generatedAt: string
}

export interface ReportRow {
  [key: string]: string | number | null
}

// Filter options (for dropdowns)
export interface FilterOptions {
  lenders: string[]
  statuses: string[]
  retailers: string[]
  bdms: string[]
  financeProducts: string[]
}
