-- Migration: Add user_type to differentiate clients and drivers
-- This allows us to distinguish between Kolifast (client) and Kolideliver (driver) users

-- Step 1: Add user_type column with default 'client'
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'client'
CHECK (user_type IN ('client', 'driver', 'admin'));

-- Step 2: Update existing users (if you have any drivers already, update them manually)
-- By default, all existing users are set to 'client'
UPDATE users SET user_type = 'client' WHERE user_type IS NULL;

-- Step 3: Set is_driver based on user_type for consistency
UPDATE users SET is_driver = (user_type = 'driver');

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- Step 5: Verify the migration
SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type;
