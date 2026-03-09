-- Missing columns in partner_commissions
-- The RPC for commission stats expects 'status' to exist.
-- The backend Repository expects 'amount', 'partner_id', 'patient_id', 'appointment_id', 'status', 'created_at', 'paid_at'.

CREATE TABLE IF NOT EXISTS partner_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Force all columns from the Db definition to exist
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

NOTIFY pgrst, 'reload schema';
