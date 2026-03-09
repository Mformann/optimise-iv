-- Fix Referral Tables and Columns

-- 1. Create referral_sources table if it doesn't exist
CREATE TABLE IF NOT EXISTS referral_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create referral_schemes table just in case it's missing too
CREATE TABLE IF NOT EXISTS referral_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    reward_type TEXT NOT NULL,
    reward_value NUMERIC NOT NULL,
    min_referrals INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure claimed_at is in referral_rewards
-- Assume referral_rewards table exists, add claimed_at if missing
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload schema';
