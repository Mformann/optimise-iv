export type UserRole = 'admin' | 'doctor' | 'reception' | 'nurse';

export type AppointmentType = 'consulting' | 'drip';

export type AppointmentStatus =
  | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  | 'pending_precheck' | 'pending_review' | 'review_risky' | 'confirmed'
  | 'preparing' | 'dispatched' | 'vitals_check' | 'vitals_cleared' | 'vitals_failed';

export type CommissionType = 'percentage' | 'fixed';

export type RewardType = 'discount' | 'free_therapy' | 'cash';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  location_type: 'clinic' | 'non_clinic';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  medical_notes?: string;
  referral_source_id?: string;
  referred_by_patient_id?: string;
  partner_id?: string;
  referral_count?: number;
  blood_test_done?: boolean | number;
  created_at: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  therapy_id?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  is_quick: boolean;
  notes?: string;
  completion_notes?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  // New fields
  actual_start_at?: string;
  actual_end_at?: string;
  final_price: number;
  remarks?: string;
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'pay_later';
  nurse_id?: string;
  inquiry_id?: string;
  is_non_clinic?: boolean;
  // Joined fields
  patient_name?: string;
  patient_phone?: string;
  doctor_name?: string;
  clinic_name?: string;
  therapy_name?: string;
  nurse_name?: string;
  drips?: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

export interface Drip {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  appointment_id?: string;
  title: string;
  message: string;
  type: 'appointment' | 'system' | 'reminder';
  is_read: boolean;
  created_at: string;
  // Joined fields
  appointment_patient_name?: string;
  appointment_date?: string;
  appointment_time?: string;
}

export type VenueType = 'gym' | 'cafe' | 'salon' | 'hotel' | 'society' | 'other';

export interface Partner {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  commission_type: CommissionType;
  commission_value: number;
  is_active: boolean;
  venue_type?: VenueType;
  clinic_id?: string;
  commission_stats?: {
    total: number;
    pending: number;
    paid: number;
  };
  created_at: string;
  updated_at?: string;
}

export interface ReferralSource {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ReferralScheme {
  id: string;
  name: string;
  description?: string;
  reward_type: RewardType;
  reward_value: number;
  min_referrals: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Therapy {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  drips?: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface WalletTransaction {
  id: string;
  patient_id: string;
  type: 'money_deposit' | 'money_spent' | 'drip_purchase' | 'drip_usage' | 'drip_expired' | 'drip_adjustment' | 'money_adjustment';
  amount: number;
  drip_id?: string;
  drip_quantity?: number;
  payment_method?: 'cash' | 'card' | 'transfer' | 'wallet' | 'admin_adjustment';
  description?: string;
  reference_id?: string;
  reference_type?: 'appointment' | 'drip_order' | 'manual';
  created_by?: string;
  created_at: string;
}

export interface DripBalance {
  id: string;
  patient_id: string;
  drip_id: string;
  drip_name: string;
  quantity: number;
  remaining_quantity: number;
  expires_at?: string;
  added_at: string;
}

export interface PatientWallet {
  balance: number;
  drip_balances: DripBalance[];
  transactions: WalletTransaction[];
}

export type DripOrderStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled';

export interface DripOrder {
  id: string;
  patient_id: string;
  drip_id: string;
  quantity: number;
  prescribed_by: string;
  delivered_by?: string;
  appointment_id?: string;
  clinic_id: string;
  status: DripOrderStatus;
  notes?: string;
  delivery_notes?: string;
  prescribed_at: string;
  delivered_at?: string;
  // Joined fields
  patient_name?: string;
  patient_phone?: string;
  drip_name?: string;
  drip_price?: number;
  prescribed_by_name?: string;
  delivered_by_name?: string;
  clinic_name?: string;
}

// Non-clinic workflow types

export type InquirySource = 'google_form' | 'whatsapp' | 'phone' | 'walk_in' | 'other';
export type InquiryStatus = 'new' | 'contacted' | 'converted' | 'lost';
export type PreCheckStatus = 'pending' | 'submitted' | 'reviewed';
export type DoctorReviewDecision = 'safe' | 'risky' | 'rejected';
export type DoctorFinalDecision = 'cleared' | 'rejected';
export type VitalsDecision = 'normal' | 'abnormal';

export interface Inquiry {
  id: string;
  partner_id: string;
  clinic_id: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  source: InquirySource;
  interest_notes?: string;
  status: InquiryStatus;
  contacted_by?: string;
  contacted_at?: string;
  patient_id?: string;
  appointment_id?: string;
  created_at: string;
  updated_at: string;
  // Joined
  partner_name?: string;
  clinic_name?: string;
  contacted_by_name?: string;
}

export interface PreCheckForm {
  id: string;
  patient_id: string;
  appointment_id: string;
  has_allergies: boolean;
  allergy_details?: string;
  has_chronic_conditions: boolean;
  chronic_condition_details?: string;
  current_medications?: string;
  is_pregnant: boolean;
  has_recent_surgery: boolean;
  surgery_details?: string;
  blood_pressure_history?: string;
  diabetes_history?: string;
  heart_condition: boolean;
  additional_notes?: string;
  status: PreCheckStatus;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorReview {
  id: string;
  pre_check_form_id: string;
  appointment_id: string;
  doctor_id: string;
  decision?: DoctorReviewDecision;
  risk_factors?: string;
  requires_call: boolean;
  call_completed: boolean;
  call_notes?: string;
  final_decision?: DoctorFinalDecision;
  notes?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  doctor_name?: string;
  patient_name?: string;
  clinic_name?: string;
}

export interface Vitals {
  id: string;
  appointment_id: string;
  nurse_id: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
  blood_sugar?: number;
  weight?: number;
  decision?: VitalsDecision;
  abnormal_notes?: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  nurse_name?: string;
  patient_name?: string;
}

export interface HostReport {
  partner: Partner;
  inquiry_count: number;
  converted_count: number;
  conversion_rate: number;
  appointment_count: number;
  completed_count: number;
  total_revenue: number;
  total_commission: number;
  pending_commission: number;
}

export type OfferType = 'money' | 'drip';

export interface Offer {
  id: string;
  name: string;
  description?: string;
  type: OfferType;
  cost: number;
  value?: number;
  drip_id?: string;
  drip_name?: string;
  drip_quantity?: number;
  expires_at_pattern?: string;
  code?: string;
  fixed_value: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface OfferRedemption {
  id: string;
  offer_id: string;
  patient_id: string;
  appointment_id?: string;
  cost_paid: number;
  payment_method: 'cash' | 'card' | 'transfer';
  value_granted?: number;
  drip_id?: string;
  drip_quantity?: number;
  created_by?: string;
  created_at: string;
}
