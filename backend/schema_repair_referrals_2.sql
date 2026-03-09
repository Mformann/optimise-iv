-- Refined Referral Schema Repair
-- Using ALTER TABLE to forcefully add missing columns even if the table already existed and was just empty/missing columns.

-- 1. Ensure tables exist (minimal columns just to create the table if missing)
CREATE TABLE IF NOT EXISTS referral_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS referral_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 2. Add ALL columns explicitly to referral_sources
ALTER TABLE referral_sources ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE referral_sources ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE referral_sources ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE referral_sources ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE referral_sources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Add ALL columns explicitly to referral_schemes
ALTER TABLE referral_schemes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE referral_schemes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE referral_schemes ADD COLUMN IF NOT EXISTS reward_type TEXT;
ALTER TABLE referral_schemes ADD COLUMN IF NOT EXISTS reward_value NUMERIC;
ALTER TABLE referral_schemes ADD COLUMN IF NOT EXISTS min_referrals INT DEFAULT 1;
ALTER TABLE referral_schemes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE referral_schemes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE referral_schemes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Add ALL columns explicitly to referral_rewards
-- Note: Foreign keys might already exist or not. Assuming they might be missing too if table was just created.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'referrer_patient_id') THEN
        ALTER TABLE referral_rewards ADD COLUMN referrer_patient_id UUID REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'referred_patient_id') THEN
        ALTER TABLE referral_rewards ADD COLUMN referred_patient_id UUID REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_rewards' AND column_name = 'scheme_id') THEN
        ALTER TABLE referral_rewards ADD COLUMN scheme_id UUID REFERENCES referral_schemes(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload schema';
