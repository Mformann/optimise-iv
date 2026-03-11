import { Request } from 'express';

export type UserRole = 'admin' | 'doctor' | 'reception' | 'nurse';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions?: string[] | null;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  phone: string | null;
  is_active: number;
  permissions: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string | null;
  location_type: 'clinic' | 'non_clinic';
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbPatient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  medical_notes: string | null;
  referral_source_id: string | null;
  referred_by_patient_id: string | null;
  partner_id: string | null;
  blood_test_done: number;
  created_at: string;
  updated_at: string;
}

export type NonClinicStatus =
  | 'pending_precheck'
  | 'pending_review'
  | 'review_risky'
  | 'confirmed'
  | 'preparing'
  | 'dispatched'
  | 'vitals_check'
  | 'vitals_cleared'
  | 'vitals_failed';

export type AppointmentStatusAll =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | NonClinicStatus;

export interface DbAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  therapy_id: string | null;
  type: 'consulting' | 'drip';
  status: AppointmentStatusAll;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  is_quick: number;
  notes: string | null;
  completion_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  final_price: number;
  remarks: string | null;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'pay_later';
  nurse_id: string | null;
  inquiry_id: string | null;
  is_non_clinic: number;
  is_home_delivery: boolean;
  home_delivery_address: string | null;
  home_delivery_charges: number | string; // Numeric in postgres can come as string
}

export interface DbDrip {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbTherapyDrip {
  id: string;
  therapy_id: string;
  drip_id: string;
  quantity: number;
  created_at: string;
}

export interface DbAppointmentDrip {
  id: string;
  appointment_id: string;
  drip_id: string;
  quantity: number;
  price_at_time: number;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  appointment_id: string | null;
  title: string;
  message: string;
  type: 'appointment' | 'system' | 'reminder';
  is_read: number;
  created_at: string;
}

export interface DbTherapy {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type VenueType = 'gym' | 'cafe' | 'salon' | 'hotel' | 'society' | 'other';

export interface DbPartner {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  is_active: number;
  venue_type: VenueType | null;
  clinic_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbReferralSource {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

export interface DbReferralScheme {
  id: string;
  name: string;
  description: string | null;
  reward_type: 'discount' | 'free_therapy' | 'cash';
  reward_value: number;
  min_referrals: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbDoctorClinic {
  id: string;
  doctor_id: string;
  clinic_id: string;
  is_primary: number;
  created_at: string;
}

export interface DbDripOrder {
  id: string;
  patient_id: string;
  drip_id: string;
  quantity: number;
  prescribed_by: string;
  delivered_by: string | null;
  appointment_id: string | null;
  clinic_id: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
  notes: string | null;
  delivery_notes: string | null;
  prescribed_at: string;
  delivered_at: string | null;
}

// Non-clinic workflow types

export type InquirySource = 'google_form' | 'whatsapp' | 'phone' | 'walk_in' | 'other';
export type InquiryStatus = 'new' | 'contacted' | 'converted' | 'lost';
export type PreCheckStatus = 'pending' | 'submitted' | 'reviewed';
export type DoctorReviewDecision = 'safe' | 'risky' | 'rejected';
export type DoctorFinalDecision = 'cleared' | 'rejected';
export type VitalsDecision = 'normal' | 'abnormal';

export interface DbInquiry {
  id: string;
  partner_id: string;
  clinic_id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  source: InquirySource;
  interest_notes: string | null;
  status: InquiryStatus;
  contacted_by: string | null;
  contacted_at: string | null;
  patient_id: string | null;
  appointment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPreCheckForm {
  id: string;
  patient_id: string;
  appointment_id: string;
  has_allergies: number;
  allergy_details: string | null;
  has_chronic_conditions: number;
  chronic_condition_details: string | null;
  current_medications: string | null;
  is_pregnant: number;
  has_recent_surgery: number;
  surgery_details: string | null;
  blood_pressure_history: string | null;
  diabetes_history: string | null;
  heart_condition: number;
  additional_notes: string | null;
  status: PreCheckStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDoctorReview {
  id: string;
  pre_check_form_id: string;
  appointment_id: string;
  doctor_id: string;
  decision: DoctorReviewDecision | null;
  risk_factors: string | null;
  requires_call: number;
  call_completed: number;
  call_notes: string | null;
  final_decision: DoctorFinalDecision | null;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOffer {
  id: string;
  name: string;
  description: string | null;
  type: 'money' | 'drip';
  cost: number;
  value: number | null;
  drips: { drip_id: string; quantity: number }[] | null;
  drip_id: string | null;
  drip_quantity: number | null;
  expires_at_pattern: string | null;
  code: string | null;
  fixed_value: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbOfferRedemption {
  id: string;
  offer_id: string;
  patient_id: string;
  appointment_id: string | null;
  cost_paid: number;
  payment_method: 'cash' | 'card' | 'transfer';
  value_granted: number | null;
  drips: { drip_id: string; quantity: number }[] | null;
  drip_id: string | null;
  drip_quantity: number | null;
  created_by: string | null;
  created_at: string;
}

export interface DbVitals {
  id: string;
  appointment_id: string;
  nurse_id: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  blood_sugar: number | null;
  weight: number | null;
  decision: VitalsDecision | null;
  abnormal_notes: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}
