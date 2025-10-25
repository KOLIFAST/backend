-- Migration: Convert first_name and last_name to full_name
-- This script migrates existing user data to the new schema

-- Step 1: Add the new full_name column (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';

-- Step 2: Merge existing first_name and last_name into full_name
UPDATE users
SET full_name = TRIM(CONCAT(first_name, ' ', last_name))
WHERE full_name = '' AND (first_name != '' OR last_name != '');

-- Step 3: Drop the old columns (only if you're sure you don't need them)
-- UNCOMMENT THESE LINES WHEN YOU'RE READY:
-- ALTER TABLE users DROP COLUMN IF EXISTS first_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS last_name;

-- Verify the migration
SELECT id, phone, full_name, created_at FROM users LIMIT 10;
