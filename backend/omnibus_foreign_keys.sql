-- ==============================================================================
-- OMNIBUS SCHEMA REPAIR SCRIPT Part 3: FOREIGN KEYS
-- This script adds foreign keys so Supabase knows how tables relate.
-- PostgREST requires these to perform joined queries automatically.
-- Run this in Supabase SQL Editor.
-- ==============================================================================

-- partners
ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_clinic_id_fkey;
ALTER TABLE partners ADD CONSTRAINT partners_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

-- patients
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_referral_source_id_fkey;
ALTER TABLE patients ADD CONSTRAINT patients_referral_source_id_fkey FOREIGN KEY (referral_source_id) REFERENCES referral_sources(id) ON DELETE SET NULL;

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_referred_by_patient_id_fkey;
ALTER TABLE patients ADD CONSTRAINT patients_referred_by_patient_id_fkey FOREIGN KEY (referred_by_patient_id) REFERENCES patients(id) ON DELETE SET NULL;

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_partner_id_fkey;
ALTER TABLE patients ADD CONSTRAINT patients_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL;

-- appointments
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_clinic_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_therapy_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_therapy_id_fkey FOREIGN KEY (therapy_id) REFERENCES therapies(id) ON DELETE SET NULL;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_nurse_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_inquiry_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE SET NULL;

-- therapy_drips
ALTER TABLE therapy_drips DROP CONSTRAINT IF EXISTS therapy_drips_therapy_id_fkey;
ALTER TABLE therapy_drips ADD CONSTRAINT therapy_drips_therapy_id_fkey FOREIGN KEY (therapy_id) REFERENCES therapies(id) ON DELETE CASCADE;

ALTER TABLE therapy_drips DROP CONSTRAINT IF EXISTS therapy_drips_drip_id_fkey;
ALTER TABLE therapy_drips ADD CONSTRAINT therapy_drips_drip_id_fkey FOREIGN KEY (drip_id) REFERENCES drips(id) ON DELETE CASCADE;

-- appointment_drips
ALTER TABLE appointment_drips DROP CONSTRAINT IF EXISTS appointment_drips_appointment_id_fkey;
ALTER TABLE appointment_drips ADD CONSTRAINT appointment_drips_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

ALTER TABLE appointment_drips DROP CONSTRAINT IF EXISTS appointment_drips_drip_id_fkey;
ALTER TABLE appointment_drips ADD CONSTRAINT appointment_drips_drip_id_fkey FOREIGN KEY (drip_id) REFERENCES drips(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_appointment_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

-- doctor_clinics
ALTER TABLE doctor_clinics DROP CONSTRAINT IF EXISTS doctor_clinics_doctor_id_fkey;
ALTER TABLE doctor_clinics ADD CONSTRAINT doctor_clinics_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE doctor_clinics DROP CONSTRAINT IF EXISTS doctor_clinics_clinic_id_fkey;
ALTER TABLE doctor_clinics ADD CONSTRAINT doctor_clinics_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- drip_orders
ALTER TABLE drip_orders DROP CONSTRAINT IF EXISTS drip_orders_patient_id_fkey;
ALTER TABLE drip_orders ADD CONSTRAINT drip_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE drip_orders DROP CONSTRAINT IF EXISTS drip_orders_drip_id_fkey;
ALTER TABLE drip_orders ADD CONSTRAINT drip_orders_drip_id_fkey FOREIGN KEY (drip_id) REFERENCES drips(id) ON DELETE CASCADE;

ALTER TABLE drip_orders DROP CONSTRAINT IF EXISTS drip_orders_prescribed_by_fkey;
ALTER TABLE drip_orders ADD CONSTRAINT drip_orders_prescribed_by_fkey FOREIGN KEY (prescribed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE drip_orders DROP CONSTRAINT IF EXISTS drip_orders_delivered_by_fkey;
ALTER TABLE drip_orders ADD CONSTRAINT drip_orders_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE drip_orders DROP CONSTRAINT IF EXISTS drip_orders_appointment_id_fkey;
ALTER TABLE drip_orders ADD CONSTRAINT drip_orders_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

ALTER TABLE drip_orders DROP CONSTRAINT IF EXISTS drip_orders_clinic_id_fkey;
ALTER TABLE drip_orders ADD CONSTRAINT drip_orders_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

-- inquiries
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_partner_id_fkey;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL;

ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_clinic_id_fkey;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_contacted_by_fkey;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_contacted_by_fkey FOREIGN KEY (contacted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_patient_id_fkey;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_appointment_id_fkey;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

-- pre_check_forms
ALTER TABLE pre_check_forms DROP CONSTRAINT IF EXISTS pre_check_forms_patient_id_fkey;
ALTER TABLE pre_check_forms ADD CONSTRAINT pre_check_forms_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE pre_check_forms DROP CONSTRAINT IF EXISTS pre_check_forms_appointment_id_fkey;
ALTER TABLE pre_check_forms ADD CONSTRAINT pre_check_forms_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

-- doctor_reviews
ALTER TABLE doctor_reviews DROP CONSTRAINT IF EXISTS doctor_reviews_pre_check_form_id_fkey;
ALTER TABLE doctor_reviews ADD CONSTRAINT doctor_reviews_pre_check_form_id_fkey FOREIGN KEY (pre_check_form_id) REFERENCES pre_check_forms(id) ON DELETE CASCADE;

ALTER TABLE doctor_reviews DROP CONSTRAINT IF EXISTS doctor_reviews_appointment_id_fkey;
ALTER TABLE doctor_reviews ADD CONSTRAINT doctor_reviews_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

ALTER TABLE doctor_reviews DROP CONSTRAINT IF EXISTS doctor_reviews_doctor_id_fkey;
ALTER TABLE doctor_reviews ADD CONSTRAINT doctor_reviews_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL;

-- offers
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_drip_id_fkey;
ALTER TABLE offers ADD CONSTRAINT offers_drip_id_fkey FOREIGN KEY (drip_id) REFERENCES drips(id) ON DELETE SET NULL;

-- offer_redemptions
ALTER TABLE offer_redemptions DROP CONSTRAINT IF EXISTS offer_redemptions_offer_id_fkey;
ALTER TABLE offer_redemptions ADD CONSTRAINT offer_redemptions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;

ALTER TABLE offer_redemptions DROP CONSTRAINT IF EXISTS offer_redemptions_patient_id_fkey;
ALTER TABLE offer_redemptions ADD CONSTRAINT offer_redemptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE offer_redemptions DROP CONSTRAINT IF EXISTS offer_redemptions_appointment_id_fkey;
ALTER TABLE offer_redemptions ADD CONSTRAINT offer_redemptions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

ALTER TABLE offer_redemptions DROP CONSTRAINT IF EXISTS offer_redemptions_drip_id_fkey;
ALTER TABLE offer_redemptions ADD CONSTRAINT offer_redemptions_drip_id_fkey FOREIGN KEY (drip_id) REFERENCES drips(id) ON DELETE SET NULL;

ALTER TABLE offer_redemptions DROP CONSTRAINT IF EXISTS offer_redemptions_created_by_fkey;
ALTER TABLE offer_redemptions ADD CONSTRAINT offer_redemptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- vitals
ALTER TABLE vitals DROP CONSTRAINT IF EXISTS vitals_appointment_id_fkey;
ALTER TABLE vitals ADD CONSTRAINT vitals_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

ALTER TABLE vitals DROP CONSTRAINT IF EXISTS vitals_nurse_id_fkey;
ALTER TABLE vitals ADD CONSTRAINT vitals_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE SET NULL;

-- Reload schema
NOTIFY pgrst, 'reload schema';
