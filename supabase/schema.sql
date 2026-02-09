-- Stax Reporting Tool Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================
-- 1. APPLICATION DECISIONS (synced from Salesforce)
-- ============================================
CREATE TABLE IF NOT EXISTS application_decisions (
  id TEXT PRIMARY KEY,
  application_number TEXT,
  lender_name TEXT,
  status TEXT,
  submitted_date DATE,
  approved_date DATE,
  declined_date DATE,
  contract_signed_date DATE,
  live_date DATE,
  cancelled_date DATE,
  expired_date DATE,
  referred_date DATE,
  loan_amount DECIMAL(12,2),
  deposit_amount DECIMAL(12,2),
  goods_amount DECIMAL(12,2),
  retailer_name TEXT,
  parent_company TEXT,
  bdm_name TEXT,
  finance_product TEXT,
  apr DECIMAL(5,2),
  term_months INTEGER,
  deferral_months INTEGER,
  prime_subprime TEXT,
  priority INTEGER,
  commission_amount DECIMAL(12,2),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_ad_submitted_date ON application_decisions(submitted_date);
CREATE INDEX IF NOT EXISTS idx_ad_lender ON application_decisions(lender_name);
CREATE INDEX IF NOT EXISTS idx_ad_status ON application_decisions(status);
CREATE INDEX IF NOT EXISTS idx_ad_retailer ON application_decisions(retailer_name);

-- ============================================
-- 2. USER PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('global_admin', 'admin', 'bdm', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('global_admin', 'admin')
    )
  );

-- Allow global_admin to update any profile
CREATE POLICY "Global admin can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'global_admin'
    )
  );

-- ============================================
-- 3. REPORT PRESETS
-- ============================================
CREATE TABLE IF NOT EXISTS report_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- Stores filters, grouping, metrics
  is_built_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE report_presets ENABLE ROW LEVEL SECURITY;

-- Users can see their own presets and built-in ones
CREATE POLICY "Users can read own and built-in presets" ON report_presets
  FOR SELECT USING (user_id = auth.uid() OR is_built_in = TRUE);

-- Users can create their own presets
CREATE POLICY "Users can create own presets" ON report_presets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own presets
CREATE POLICY "Users can update own presets" ON report_presets
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own presets
CREATE POLICY "Users can delete own presets" ON report_presets
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 4. GENERATED REPORTS (history)
-- ============================================
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id UUID REFERENCES report_presets(id) ON DELETE SET NULL,
  name TEXT,
  config JSONB NOT NULL, -- Filters, grouping, metrics used
  result_summary JSONB, -- Summary stats
  record_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own reports
CREATE POLICY "Users can read own reports" ON generated_reports
  FOR SELECT USING (user_id = auth.uid());

-- Admins can see all reports
CREATE POLICY "Admins can read all reports" ON generated_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('global_admin', 'admin')
    )
  );

-- Users can create reports
CREATE POLICY "Users can create reports" ON generated_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. SYNC LOG
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT
);

-- No RLS needed - only accessed by service role

-- ============================================
-- 6. FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.email = 'barney.goodman@sherminfinance.co.uk' THEN 'global_admin'
      ELSE 'viewer'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. SEED: Built-in report presets
-- ============================================
INSERT INTO report_presets (id, user_id, name, description, config, is_built_in) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Monthly Approval Rate',
    'Track approval rates by lender over time',
    '{"reportType":"AD","groupBy":["lender_name","month"],"metrics":["volume","approval_rate"],"filters":{}}',
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    NULL,
    'Lender Conversion Funnel',
    'Application to settlement by lender',
    '{"reportType":"AD","groupBy":["lender_name","status"],"metrics":["volume","execution_rate"],"filters":{}}',
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'Commission by Retailer',
    'Commission breakdown by retailer and product',
    '{"reportType":"AD","groupBy":["retailer_name","finance_product"],"metrics":["commission","volume"],"filters":{}}',
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    NULL,
    'Application Pipeline',
    'Current applications by status and age',
    '{"reportType":"AD","groupBy":["status"],"metrics":["volume","loan_value"],"filters":{}}',
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    NULL,
    'Retailer Volume Trends',
    'Weekly volume by retailer over time',
    '{"reportType":"AD","groupBy":["retailer_name","week"],"metrics":["volume","loan_value"],"filters":{}}',
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    NULL,
    'Prime vs Sub-Prime Split',
    'Compare prime and sub-prime metrics',
    '{"reportType":"AD","groupBy":["prime_subprime","lender_name"],"metrics":["volume","approval_rate","execution_rate"],"filters":{}}',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. SCHEDULED REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL, -- Report configuration (filters, grouping, metrics)
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_day INTEGER, -- Day of week (0-6) for weekly, day of month (1-31) for monthly
  schedule_time TIME NOT NULL DEFAULT '09:00', -- Time of day to run
  recipients JSONB NOT NULL, -- Array of email addresses
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding due reports
CREATE INDEX IF NOT EXISTS idx_sr_next_run ON scheduled_reports(next_run_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sr_user ON scheduled_reports(user_id);

-- Enable RLS
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own scheduled reports
CREATE POLICY "Users can read own scheduled reports" ON scheduled_reports
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own scheduled reports
CREATE POLICY "Users can create own scheduled reports" ON scheduled_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own scheduled reports
CREATE POLICY "Users can update own scheduled reports" ON scheduled_reports
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own scheduled reports
CREATE POLICY "Users can delete own scheduled reports" ON scheduled_reports
  FOR DELETE USING (user_id = auth.uid());

-- Admins can view all scheduled reports
CREATE POLICY "Admins can read all scheduled reports" ON scheduled_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('global_admin', 'admin')
    )
  );

-- ============================================
-- 9. SCHEDULED REPORT RUNS (execution log)
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  record_count INTEGER,
  result_summary JSONB,
  error_message TEXT,
  email_sent BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_srr_schedule ON scheduled_report_runs(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_srr_status ON scheduled_report_runs(status);

-- Enable RLS
ALTER TABLE scheduled_report_runs ENABLE ROW LEVEL SECURITY;

-- Users can see runs for their own scheduled reports
CREATE POLICY "Users can read own scheduled report runs" ON scheduled_report_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheduled_reports WHERE id = scheduled_report_id AND user_id = auth.uid()
    )
  );

-- Admins can view all runs
CREATE POLICY "Admins can read all scheduled report runs" ON scheduled_report_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('global_admin', 'admin')
    )
  );

-- ============================================
-- 10. FUNCTION: Calculate next run time
-- ============================================
CREATE OR REPLACE FUNCTION calculate_next_run(
  p_schedule_type TEXT,
  p_schedule_day INTEGER,
  p_schedule_time TIME
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_run TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_today DATE := CURRENT_DATE;
  v_current_dow INTEGER := EXTRACT(DOW FROM v_today);
  v_current_dom INTEGER := EXTRACT(DAY FROM v_today);
BEGIN
  CASE p_schedule_type
    WHEN 'daily' THEN
      -- Run today if time hasn't passed, otherwise tomorrow
      IF v_now::TIME < p_schedule_time THEN
        v_next_run := v_today + p_schedule_time;
      ELSE
        v_next_run := (v_today + INTERVAL '1 day') + p_schedule_time;
      END IF;

    WHEN 'weekly' THEN
      -- Find next occurrence of the specified day
      IF v_current_dow = p_schedule_day AND v_now::TIME < p_schedule_time THEN
        v_next_run := v_today + p_schedule_time;
      ELSE
        v_next_run := (v_today + ((7 + p_schedule_day - v_current_dow) % 7 +
          CASE WHEN v_current_dow = p_schedule_day THEN 7 ELSE 0 END) * INTERVAL '1 day') + p_schedule_time;
      END IF;

    WHEN 'monthly' THEN
      -- Find next occurrence of the specified day of month
      IF v_current_dom = p_schedule_day AND v_now::TIME < p_schedule_time THEN
        v_next_run := v_today + p_schedule_time;
      ELSIF v_current_dom < p_schedule_day THEN
        -- This month, on the specified day
        v_next_run := DATE_TRUNC('month', v_today) + (p_schedule_day - 1) * INTERVAL '1 day' + p_schedule_time;
      ELSE
        -- Next month, on the specified day
        v_next_run := DATE_TRUNC('month', v_today) + INTERVAL '1 month' + (p_schedule_day - 1) * INTERVAL '1 day' + p_schedule_time;
      END IF;
  END CASE;

  RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. TRIGGER: Update next_run_at on schedule changes
-- ============================================
CREATE OR REPLACE FUNCTION update_scheduled_report_next_run()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_run_at := calculate_next_run(NEW.schedule_type, NEW.schedule_day, NEW.schedule_time);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_schedule_next_run ON scheduled_reports;
CREATE TRIGGER trigger_update_schedule_next_run
  BEFORE INSERT OR UPDATE OF schedule_type, schedule_day, schedule_time ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_scheduled_report_next_run();

-- ============================================
-- DONE! Your database is ready.
-- ============================================
