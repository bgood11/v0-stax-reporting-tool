-- Migration: Create User BDM Assignments Table
-- Date: 2026-02-06
-- Updated: 2026-02-07 - Changed from retailer to BDM name filtering
-- Purpose: Enable row-level security for users to only access assigned BDM data

-- ============================================
-- USER BDM ASSIGNMENTS TABLE
-- ============================================
-- Maps user emails to BDM names they have access to
-- BDM names come from application_decisions.bdm_name field
-- This enables fine-grained access control where:
-- - Admin users: see ALL data (no filtering)
-- - Users with "ALL" bdm_name: see all data
-- - Users with specific bdm_names: see ONLY data for those BDMs
-- - Users with no assignments: see NO data

CREATE TABLE IF NOT EXISTS user_bdm_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  bdm_name TEXT NOT NULL,  -- Matches application_decisions.bdm_name
  assigned_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure each user-bdm combo is unique
  UNIQUE(user_email, bdm_name)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_bdm_assignments_email ON user_bdm_assignments(user_email);
CREATE INDEX IF NOT EXISTS idx_user_bdm_assignments_bdm ON user_bdm_assignments(bdm_name);

-- Add comment to table
COMMENT ON TABLE user_bdm_assignments IS 'Maps user emails to BDM names they can access. Used for row-level security enforcement.';
COMMENT ON COLUMN user_bdm_assignments.user_email IS 'Email address of the user (matches auth.users.email)';
COMMENT ON COLUMN user_bdm_assignments.bdm_name IS 'BDM name to filter by (matches application_decisions.bdm_name). Use "ALL" for full access.';
COMMENT ON COLUMN user_bdm_assignments.assigned_at IS 'When this assignment was created';

-- Drop old table if exists (migration from retailer-based to bdm-based)
DROP TABLE IF EXISTS bdm_retailer_assignments;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Run this migration in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Or it will be automatically applied if using Supabase CLI
