-- Fix Partners Table Columns
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
