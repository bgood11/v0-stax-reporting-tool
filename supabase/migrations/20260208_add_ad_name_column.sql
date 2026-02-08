-- Add ad_name column for explicit Application Decision Name display
-- The 'id' column already contains AD-XXXXXX but this makes it clearer

-- Add ad_name column as an alias
ALTER TABLE application_decisions ADD COLUMN IF NOT EXISTS ad_name TEXT;

-- Update existing records to copy id to ad_name
UPDATE application_decisions SET ad_name = id WHERE ad_name IS NULL;

-- Add index for ad_name
CREATE INDEX IF NOT EXISTS idx_ad_ad_name ON application_decisions(ad_name);

-- Add index for application_number (for AP reports grouping)
CREATE INDEX IF NOT EXISTS idx_ad_application_number ON application_decisions(application_number);

-- Create view for AP-level reports (aggregated by application_number)
CREATE OR REPLACE VIEW application_summary AS
SELECT
  application_number,
  COUNT(*) as decision_count,
  -- Get the "best" status (hierarchy: Live > Executed > Approved > Referred > Declined > Cancelled > Expired > Created)
  CASE
    WHEN COUNT(*) FILTER (WHERE status = 'Live') > 0 THEN 'Live'
    WHEN COUNT(*) FILTER (WHERE status = 'Executed') > 0 THEN 'Executed'
    WHEN COUNT(*) FILTER (WHERE status = 'Approved') > 0 THEN 'Approved'
    WHEN COUNT(*) FILTER (WHERE status = 'Referred') > 0 THEN 'Referred'
    WHEN COUNT(*) FILTER (WHERE status = 'Declined') > 0 THEN 'Declined'
    WHEN COUNT(*) FILTER (WHERE status = 'Cancelled') > 0 THEN 'Cancelled'
    WHEN COUNT(*) FILTER (WHERE status = 'Expired') > 0 THEN 'Expired'
    ELSE 'Created'
  END as application_status,
  -- Aggregated amounts (from the "winning" decision or max)
  MAX(loan_amount) as loan_amount,
  MAX(deposit_amount) as deposit_amount,
  MAX(goods_amount) as goods_amount,
  MAX(commission_amount) as commission_amount,
  -- Dates
  MIN(submitted_date) as submitted_date,
  MAX(approved_date) as approved_date,
  MAX(contract_signed_date) as contract_signed_date,
  MAX(live_date) as live_date,
  -- Common fields (take first non-null)
  MAX(retailer_name) as retailer_name,
  MAX(parent_company) as parent_company,
  MAX(bdm_name) as bdm_name,
  MAX(finance_product) as finance_product,
  MAX(prime_subprime) as prime_subprime,
  -- Lenders involved (array)
  ARRAY_AGG(DISTINCT lender_name ORDER BY lender_name) FILTER (WHERE lender_name IS NOT NULL) as lenders_involved
FROM application_decisions
WHERE application_number IS NOT NULL
GROUP BY application_number;

-- Comment on the view
COMMENT ON VIEW application_summary IS 'Aggregated view of applications (AP level) from individual decisions (AD level)';
