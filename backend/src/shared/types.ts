// Shared types between frontend and backend

export type UserRole = 'admin' | 'doctor' | 'reception' | 'nurse';

export type AppointmentType = 'consulting' | 'drip';

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export type CommissionType = 'percentage' | 'fixed';

export type RewardType = 'discount' | 'free_therapy' | 'cash';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    phone?: string;
    is_active: boolean;
    nurse_type?: 'inhouse' | 'freelancer';
    created_at: string;
    updated_at: string;
}

export interface Clinic {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    email?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface DoctorClinic {
    id: string;
    doctor_id: string;
    clinic_id: string;
    is_primary: boolean;
    created_at: string;
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
    created_at: string;
    updated_at: string;
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
    is_home_delivery?: boolean;
    home_delivery_address?: string;
    home_delivery_charges?: number;
    nurse_id?: string;
    created_at: string;
    updated_at: string;
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
}

export interface Partner {
    id: string;
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    commission_type: CommissionType;
    commission_value: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
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
    updated_at: string;
}

export interface Therapy {
    id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// API Response types
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

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface CreateUserRequest {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone?: string;
}

export interface CreatePatientRequest {
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
}

export interface CreateAppointmentRequest {
    patient_id: string;
    doctor_id: string;
    clinic_id: string;
    therapy_id?: string;
    type: AppointmentType;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes?: number;
    is_quick?: boolean;
    notes?: string;
}

export interface CompleteAppointmentRequest {
    completion_notes?: string;
}
