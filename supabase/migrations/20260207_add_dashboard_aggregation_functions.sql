-- Dashboard aggregation functions for efficient queries
-- These replace fetching all rows and aggregating in JavaScript

-- Function to get status counts
CREATE OR REPLACE FUNCTION get_status_counts()
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(status, 'Unknown') as status,
    COUNT(*) as count
  FROM application_decisions
  GROUP BY status
  ORDER BY count DESC;
$$;

-- Function to get dashboard totals
CREATE OR REPLACE FUNCTION get_dashboard_totals()
RETURNS TABLE(
  total_applications BIGINT,
  total_loan_value NUMERIC,
  total_commission NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*) as total_applications,
    COALESCE(SUM(loan_amount), 0) as total_loan_value,
    COALESCE(SUM(commission_amount), 0) as total_commission
  FROM application_decisions;
$$;

-- Function to get distinct lender names
CREATE OR REPLACE FUNCTION get_distinct_lenders()
RETURNS TABLE(lender_name TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT lender_name
  FROM application_decisions
  WHERE lender_name IS NOT NULL AND lender_name != ''
  ORDER BY lender_name;
$$;

-- Function to get distinct retailer names
CREATE OR REPLACE FUNCTION get_distinct_retailers()
RETURNS TABLE(retailer_name TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT retailer_name
  FROM application_decisions
  WHERE retailer_name IS NOT NULL AND retailer_name != ''
  ORDER BY retailer_name;
$$;

-- Function to get distinct statuses
CREATE OR REPLACE FUNCTION get_distinct_statuses()
RETURNS TABLE(status TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT status
  FROM application_decisions
  WHERE status IS NOT NULL AND status != ''
  ORDER BY status;
$$;

-- Function to get distinct prime/subprime values
CREATE OR REPLACE FUNCTION get_distinct_prime_subprime()
RETURNS TABLE(prime_subprime TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT prime_subprime
  FROM application_decisions
  WHERE prime_subprime IS NOT NULL AND prime_subprime != ''
  ORDER BY prime_subprime;
$$;

-- Function to get distinct BDM names
CREATE OR REPLACE FUNCTION get_distinct_bdms()
RETURNS TABLE(bdm_name TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT bdm_name
  FROM application_decisions
  WHERE bdm_name IS NOT NULL AND bdm_name != ''
  ORDER BY bdm_name;
$$;

-- Function to get distinct finance products
CREATE OR REPLACE FUNCTION get_distinct_finance_products()
RETURNS TABLE(finance_product TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT finance_product
  FROM application_decisions
  WHERE finance_product IS NOT NULL AND finance_product != ''
  ORDER BY finance_product;
$$;

-- Function to get date range
CREATE OR REPLACE FUNCTION get_date_range()
RETURNS TABLE(min_date TIMESTAMPTZ, max_date TIMESTAMPTZ)
LANGUAGE sql
STABLE
AS $$
  SELECT
    MIN(submitted_date) as min_date,
    MAX(submitted_date) as max_date
  FROM application_decisions;
$$;

-- Comprehensive function to get all filter options at once
CREATE OR REPLACE FUNCTION get_all_filter_options()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'lenders', (SELECT COALESCE(json_agg(DISTINCT lender_name ORDER BY lender_name), '[]'::json) FROM application_decisions WHERE lender_name IS NOT NULL AND lender_name != ''),
    'retailers', (SELECT COALESCE(json_agg(DISTINCT retailer_name ORDER BY retailer_name), '[]'::json) FROM application_decisions WHERE retailer_name IS NOT NULL AND retailer_name != ''),
    'statuses', (SELECT COALESCE(json_agg(DISTINCT status ORDER BY status), '[]'::json) FROM application_decisions WHERE status IS NOT NULL AND status != ''),
    'primeSubprime', (SELECT COALESCE(json_agg(DISTINCT prime_subprime ORDER BY prime_subprime), '[]'::json) FROM application_decisions WHERE prime_subprime IS NOT NULL AND prime_subprime != ''),
    'bdms', (SELECT COALESCE(json_agg(DISTINCT bdm_name ORDER BY bdm_name), '[]'::json) FROM application_decisions WHERE bdm_name IS NOT NULL AND bdm_name != ''),
    'financeProducts', (SELECT COALESCE(json_agg(DISTINCT finance_product ORDER BY finance_product), '[]'::json) FROM application_decisions WHERE finance_product IS NOT NULL AND finance_product != ''),
    'dateRange', json_build_object(
      'min', (SELECT MIN(submitted_date) FROM application_decisions),
      'max', (SELECT MAX(submitted_date) FROM application_decisions)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Comprehensive dashboard stats function
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalApplications', (SELECT COUNT(*) FROM application_decisions),
    'totalLoanValue', (SELECT COALESCE(SUM(loan_amount), 0) FROM application_decisions),
    'totalCommission', (SELECT COALESCE(SUM(commission_amount), 0) FROM application_decisions),
    'statusBreakdown', (
      SELECT COALESCE(json_object_agg(COALESCE(status, 'Unknown'), cnt), '{}'::json)
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM application_decisions
        GROUP BY status
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$;
