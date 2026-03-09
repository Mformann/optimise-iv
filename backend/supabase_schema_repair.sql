-- Supabase Schema Repair Script

-- Add missing column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;

-- Ensure vitals table has correct foreign keys
--ALTER TABLE vitals ADD CONSTRAINT vitals_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
ALTER TABLE vitals ADD CONSTRAINT vitals_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE SET NULL;

-- Ensure wallet_transactions table has correct foreign key
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

-- Ensure therapy_drips table has correct foreign keys
ALTER TABLE therapy_drips ADD CONSTRAINT therapy_drips_therapy_id_fkey FOREIGN KEY (therapy_id) REFERENCES therapies(id) ON DELETE CASCADE;
ALTER TABLE therapy_drips ADD CONSTRAINT therapy_drips_drip_id_fkey FOREIGN KEY (drip_id) REFERENCES drips(id) ON DELETE CASCADE;

-- Ensure referral_rewards table has correct foreign keys
ALTER TABLE referral_rewards ADD CONSTRAINT referral_rewards_referrer_patient_id_fkey FOREIGN KEY (referrer_patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE referral_rewards ADD CONSTRAINT referral_rewards_referred_patient_id_fkey FOREIGN KEY (referred_patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE referral_rewards ADD CONSTRAINT referral_rewards_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES referral_schemes(id) ON DELETE CASCADE;

-- Ensure pre_check_forms table has correct foreign keys
ALTER TABLE pre_check_forms ADD CONSTRAINT pre_check_forms_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE pre_check_forms ADD CONSTRAINT pre_check_forms_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;