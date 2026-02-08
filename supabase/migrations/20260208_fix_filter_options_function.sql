-- FIX: The original get_all_filter_options() used invalid PostgreSQL syntax
-- json_agg(DISTINCT col ORDER BY col) is NOT valid - ORDER BY can't be used with DISTINCT in aggregates

-- Drop and recreate with correct syntax
DROP FUNCTION IF EXISTS get_all_filter_options();

CREATE OR REPLACE FUNCTION get_all_filter_options()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  lenders_arr JSON;
  retailers_arr JSON;
  statuses_arr JSON;
  prime_arr JSON;
  bdms_arr JSON;
  products_arr JSON;
  min_date TIMESTAMPTZ;
  max_date TIMESTAMPTZ;
BEGIN
  -- Get distinct lenders
  SELECT COALESCE(json_agg(lender_name ORDER BY lender_name), '[]'::json)
  INTO lenders_arr
  FROM (SELECT DISTINCT lender_name FROM application_decisions WHERE lender_name IS NOT NULL AND lender_name != '') sub;

  -- Get distinct retailers
  SELECT COALESCE(json_agg(retailer_name ORDER BY retailer_name), '[]'::json)
  INTO retailers_arr
  FROM (SELECT DISTINCT retailer_name FROM application_decisions WHERE retailer_name IS NOT NULL AND retailer_name != '') sub;

  -- Get distinct statuses
  SELECT COALESCE(json_agg(status ORDER BY status), '[]'::json)
  INTO statuses_arr
  FROM (SELECT DISTINCT status FROM application_decisions WHERE status IS NOT NULL AND status != '') sub;

  -- Get distinct prime/subprime
  SELECT COALESCE(json_agg(prime_subprime ORDER BY prime_subprime), '[]'::json)
  INTO prime_arr
  FROM (SELECT DISTINCT prime_subprime FROM application_decisions WHERE prime_subprime IS NOT NULL AND prime_subprime != '') sub;

  -- Get distinct BDMs
  SELECT COALESCE(json_agg(bdm_name ORDER BY bdm_name), '[]'::json)
  INTO bdms_arr
  FROM (SELECT DISTINCT bdm_name FROM application_decisions WHERE bdm_name IS NOT NULL AND bdm_name != '') sub;

  -- Get distinct finance products
  SELECT COALESCE(json_agg(finance_product ORDER BY finance_product), '[]'::json)
  INTO products_arr
  FROM (SELECT DISTINCT finance_product FROM application_decisions WHERE finance_product IS NOT NULL AND finance_product != '') sub;

  -- Get date range
  SELECT MIN(submitted_date), MAX(submitted_date)
  INTO min_date, max_date
  FROM application_decisions;

  -- Build result
  result := json_build_object(
    'lenders', lenders_arr,
    'retailers', retailers_arr,
    'statuses', statuses_arr,
    'primeSubprime', prime_arr,
    'bdms', bdms_arr,
    'financeProducts', products_arr,
    'dateRange', json_build_object('min', min_date, 'max', max_date)
  );

  RETURN result;
END;
$$;

-- Also fix get_dashboard_stats to be more robust
DROP FUNCTION IF EXISTS get_dashboard_stats();

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  total_apps BIGINT;
  total_loan NUMERIC;
  total_comm NUMERIC;
  status_breakdown JSON;
BEGIN
  -- Get totals
  SELECT COUNT(*), COALESCE(SUM(loan_amount), 0), COALESCE(SUM(commission_amount), 0)
  INTO total_apps, total_loan, total_comm
  FROM application_decisions;

  -- Get status breakdown
  SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
  INTO status_breakdown
  FROM (
    SELECT COALESCE(status, 'Unknown') as status, COUNT(*) as cnt
    FROM application_decisions
    GROUP BY COALESCE(status, 'Unknown')
  ) s;

  -- Build result
  result := json_build_object(
    'totalApplications', total_apps,
    'totalLoanValue', total_loan,
    'totalCommission', total_comm,
    'statusBreakdown', status_breakdown
  );

  RETURN result;
END;
$$;

-- Quick test to verify the functions work
-- SELECT get_all_filter_options();
-- SELECT get_dashboard_stats();
