-- Supabase Schema Update
-- Adding missing columns to users, clinics, and partners

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
-- We know 'name' exists but 'first_name' and 'last_name' also exist from test4.ts. 'is_active' exists.

-- Clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'clinic';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Partners
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS venue_type TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload schema';
