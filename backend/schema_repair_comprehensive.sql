-- Supabase Schema Repair (Comprehensive)
-- Adding ALL missing columns based on TypeScript interfaces

-- Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Clinics Table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'clinic';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Partners Table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS venue_type TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Patients Table (Adding fields from DbPatient if missing)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_source_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referred_by_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_test_done BOOLEAN DEFAULT false;

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload schema';
