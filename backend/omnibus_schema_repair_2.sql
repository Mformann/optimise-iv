-- ==============================================================================
-- OMNIBUS SCHEMA REPAIR SCRIPT Part 2: OTHERS
-- This script ensures all secondary tables and their columns exist.
-- Run this in Supabase SQL Editor.
-- ==============================================================================

-- 1. Create Base Tables if they don't exist
CREATE TABLE IF NOT EXISTS therapy_drips (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS appointment_drips (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS doctor_clinics (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS drip_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS inquiries (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS pre_check_forms (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS doctor_reviews (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS offer_redemptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE IF NOT EXISTS vitals (id UUID PRIMARY KEY DEFAULT gen_random_uuid());

-- 2. Add Columns

-- therapy_drips
ALTER TABLE therapy_drips ADD COLUMN IF NOT EXISTS therapy_id UUID;
ALTER TABLE therapy_drips ADD COLUMN IF NOT EXISTS drip_id UUID;
ALTER TABLE therapy_drips ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
ALTER TABLE therapy_drips ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- appointment_drips
ALTER TABLE appointment_drips ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE appointment_drips ADD COLUMN IF NOT EXISTS drip_id UUID;
ALTER TABLE appointment_drips ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
ALTER TABLE appointment_drips ADD COLUMN IF NOT EXISTS price_at_time NUMERIC DEFAULT 0;
ALTER TABLE appointment_drips ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- doctor_clinics
ALTER TABLE doctor_clinics ADD COLUMN IF NOT EXISTS doctor_id UUID;
ALTER TABLE doctor_clinics ADD COLUMN IF NOT EXISTS clinic_id UUID;
ALTER TABLE doctor_clinics ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE doctor_clinics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- drip_orders
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS drip_id UUID;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS prescribed_by UUID;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS delivered_by UUID;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS clinic_id UUID;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS prescribed_at TIMESTAMPTZ;
ALTER TABLE drip_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- inquiries
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS partner_id UUID;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS clinic_id UUID;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS interest_notes TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contacted_by UUID;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- pre_check_forms
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS has_allergies BOOLEAN DEFAULT false;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS allergy_details TEXT;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS has_chronic_conditions BOOLEAN DEFAULT false;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS chronic_condition_details TEXT;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS is_pregnant BOOLEAN DEFAULT false;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS has_recent_surgery BOOLEAN DEFAULT false;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS surgery_details TEXT;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS blood_pressure_history TEXT;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS diabetes_history TEXT;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS heart_condition BOOLEAN DEFAULT false;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS additional_notes TEXT;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE pre_check_forms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- doctor_reviews
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS pre_check_form_id UUID;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS doctor_id UUID;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS risk_factors TEXT;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS requires_call BOOLEAN DEFAULT false;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS call_completed BOOLEAN DEFAULT false;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS call_notes TEXT;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS final_decision TEXT;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE doctor_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- offer_redemptions
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS offer_id UUID;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS cost_paid NUMERIC;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS value_granted NUMERIC;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS drip_id UUID;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS drip_quantity INT;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE offer_redemptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- vitals
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS nurse_id UUID;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS blood_pressure_systolic INT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS blood_pressure_diastolic INT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS heart_rate INT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS temperature NUMERIC;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS oxygen_saturation INT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS blood_sugar NUMERIC;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS abnormal_notes TEXT;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- reload schema instantly so UI tools are happy
NOTIFY pgrst, 'reload schema';
