import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbDoctorReview, DoctorReviewDecision, DoctorFinalDecision } from '../types/index.js';

export interface DoctorReviewWithDetails extends DbDoctorReview {
  doctor_name: string;
  patient_name?: string;
  clinic_name?: string;
}

const REVIEW_SELECT = `
  *,
  users!doctor_reviews_doctor_id_fkey(name),
  appointments!doctor_reviews_appointment_id_fkey(
    patients(first_name, last_name),
    clinics(name)
  )
`;

const mapReview = (dr: any): DoctorReviewWithDetails => ({
  ...dr,
  doctor_name: dr.users?.name ?? '',
  patient_name: dr.appointments?.patients
    ? `${dr.appointments.patients.first_name} ${dr.appointments.patients.last_name}`
    : undefined,
  clinic_name: dr.appointments?.clinics?.name ?? undefined,
  users: undefined,
  appointments: undefined,
});

export const doctorReviewRepository = {
  async findByAppointmentId(appointmentId: string): Promise<DoctorReviewWithDetails | undefined> {
    const { data, error } = await supabaseAdmin
      .from('doctor_reviews')
      .select(REVIEW_SELECT)
      .eq('appointment_id', appointmentId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReview(data) : undefined;
  },

  async findById(id: string): Promise<DoctorReviewWithDetails | undefined> {
    const { data, error } = await supabaseAdmin
      .from('doctor_reviews')
      .select(REVIEW_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReview(data) : undefined;
  },

  async create(data: {
    pre_check_form_id: string;
    appointment_id: string;
    doctor_id: string;
    decision: DoctorReviewDecision;
    risk_factors?: string | null;
    requires_call?: number;
    notes?: string | null;
  }): Promise<DoctorReviewWithDetails> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('doctor_reviews').insert({
      id,
      pre_check_form_id: data.pre_check_form_id,
      appointment_id: data.appointment_id,
      doctor_id: data.doctor_id,
      decision: data.decision,
      risk_factors: data.risk_factors ?? null,
      requires_call: data.requires_call ?? 0,
      notes: data.notes ?? null,
      reviewed_at: now,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    return (await this.findById(id))!;
  },

  async completeDoctorCall(
    id: string,
    callNotes: string,
    finalDecision: DoctorFinalDecision
  ): Promise<DoctorReviewWithDetails | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('doctor_reviews')
      .update({ call_completed: 1, call_notes: callNotes, final_decision: finalDecision, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async findPendingReviews(doctorId?: string): Promise<DoctorReviewWithDetails[]> {
    // Pending reviews are those where the appointment is in 'pending_review' or 'review_risky' state
    let q = supabaseAdmin
      .from('doctor_reviews')
      .select(REVIEW_SELECT)
      .order('created_at', { ascending: false });

    if (doctorId) q = q.eq('doctor_id', doctorId);

    const { data, error } = await q;
    if (error) {
      console.warn('doctor_reviews get/missing error:', error.message);
      return [];
    }

    // Filter to only appointments in the right statuses
    return ((data ?? []) as any[])
      .filter((dr) => {
        const status = dr.appointments?.status;
        return status === 'pending_review' || status === 'review_risky';
      })
      .map(mapReview);
  },

  async findAllPendingAppointments(): Promise<
    { appointment_id: string; patient_name: string; clinic_name: string; scheduled_date: string }[]
  > {
    // Appointments with status 'pending_review' that have no doctor_review record
    const { data, error } = await supabaseAdmin.rpc('get_pending_review_appointments');
    if (error) {
      console.warn('pending_review_appointments rpc missing or error:', error.message);
      return [];
    }
    return (data ?? []) as { appointment_id: string; patient_name: string; clinic_name: string; scheduled_date: string }[];
  },
};
