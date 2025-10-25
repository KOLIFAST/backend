-- KYC Schema for Driver Verification System
-- This schema supports the 5-step KYC process for Kolideliver drivers

-- Table 1: KYC Documents
-- Stores all uploaded documents (identity, address proof, selfie)
CREATE TABLE IF NOT EXISTS kyc_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('identity', 'address', 'selfie')),

  -- Identity document specific fields
  identity_document_type TEXT CHECK (identity_document_type IN ('cni', 'passport', 'permit')),

  -- File storage paths
  front_image_path TEXT,
  back_image_path TEXT,  -- Only for some identity documents (CNI)

  -- File metadata
  file_size INTEGER,  -- in bytes
  mime_type TEXT,     -- image/jpeg, image/png, application/pdf

  -- Verification status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  verified_by TEXT,  -- admin user ID who verified
  verified_at TIMESTAMPTZ,

  -- Rejection handling
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_identity_type CHECK (
    (document_type = 'identity' AND identity_document_type IS NOT NULL) OR
    (document_type != 'identity')
  )
);

-- Table 2: KYC References
-- Stores personal references provided by drivers
CREATE TABLE IF NOT EXISTS kyc_references (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Reference information
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relation TEXT NOT NULL,  -- e.g., "Friend", "Family", "Colleague"

  -- Verification
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'not_contacted')),
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: KYC Status
-- Overall KYC verification status for each driver
CREATE TABLE IF NOT EXISTS kyc_status (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Individual step statuses
  identity_status TEXT DEFAULT 'not_submitted' CHECK (identity_status IN ('not_submitted', 'pending', 'verified', 'rejected')),
  address_status TEXT DEFAULT 'not_submitted' CHECK (address_status IN ('not_submitted', 'pending', 'verified', 'rejected')),
  selfie_status TEXT DEFAULT 'not_submitted' CHECK (selfie_status IN ('not_submitted', 'pending', 'verified', 'rejected')),
  references_status TEXT DEFAULT 'not_submitted' CHECK (references_status IN ('not_submitted', 'pending', 'verified', 'rejected', 'skipped')),

  -- Overall status
  overall_status TEXT DEFAULT 'not_started' CHECK (overall_status IN ('not_started', 'in_progress', 'pending_review', 'verified', 'rejected')),

  -- Completion percentage (0-100)
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),

  -- Important dates
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Rejection handling
  rejection_reason TEXT,
  can_resubmit BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add driver-specific fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_driver BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_verified BOOLEAN DEFAULT FALSE;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_type ON kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_kyc_references_user_id ON kyc_references(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status_overall_status ON kyc_status(overall_status);

-- Function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update 'updated_at'
CREATE TRIGGER update_kyc_documents_updated_at
  BEFORE UPDATE ON kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_references_updated_at
  BEFORE UPDATE ON kyc_references
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_status_updated_at
  BEFORE UPDATE ON kyc_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE kyc_documents IS 'Stores all KYC documents uploaded by drivers (identity, address proof, selfie)';
COMMENT ON TABLE kyc_references IS 'Personal references provided by drivers during KYC verification';
COMMENT ON TABLE kyc_status IS 'Overall KYC verification status tracking for each driver';
COMMENT ON COLUMN users.is_driver IS 'Flag to identify if user is a driver (for Kolideliver app)';
COMMENT ON COLUMN users.driver_verified IS 'Flag to indicate if driver has completed KYC verification';
