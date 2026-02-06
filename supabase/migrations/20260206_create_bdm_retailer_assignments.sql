-- Migration: Create BDM Retailer Assignments Table
-- Date: 2026-02-06
-- Purpose: Enable row-level security for BDM users to only access assigned retailers

-- ============================================
-- BDM RETAILER ASSIGNMENTS TABLE
-- ============================================
-- Maps BDM user emails to retailers they have access to
-- This enables fine-grained access control where:
-- - Admin users: see ALL retailers
-- - BDM users: see ONLY their assigned retailers
-- - Viewer users: see NO data (unless explicitly granted)

CREATE TABLE IF NOT EXISTS bdm_retailer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  retailer_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure each user-retailer combo is unique
  UNIQUE(user_email, retailer_name)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_bdm_assignments_user_email ON bdm_retailer_assignments(user_email);
CREATE INDEX IF NOT EXISTS idx_bdm_assignments_retailer ON bdm_retailer_assignments(retailer_name);

-- Enable RLS (optional - typically this is accessed by service role API routes)
-- ALTER TABLE bdm_retailer_assignments ENABLE ROW LEVEL SECURITY;

-- Add comment to table
COMMENT ON TABLE bdm_retailer_assignments IS 'Maps BDM user emails to retailers they can access. Used for row-level security enforcement.';
COMMENT ON COLUMN bdm_retailer_assignments.user_email IS 'Email address of the BDM user (matches auth.users.email)';
COMMENT ON COLUMN bdm_retailer_assignments.retailer_name IS 'Name of the retailer (matches application_decisions.retailer_name)';
COMMENT ON COLUMN bdm_retailer_assignments.assigned_at IS 'When this assignment was created';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Run this migration in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Or it will be automatically applied if using Supabase CLI
