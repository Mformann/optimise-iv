-- Emergency fix for partners missing 'status' column
-- It seems the API tries to select 'status' from partners.
ALTER TABLE partners ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

NOTIFY pgrst, 'reload schema';
