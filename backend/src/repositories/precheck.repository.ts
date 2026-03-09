import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbPreCheckForm } from '../types/index.js';

export const precheckRepository = {
  async findByAppointmentId(appointmentId: string): Promise<DbPreCheckForm | undefined> {
    const { data, error } = await supabaseAdmin
      .from('pre_check_forms')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();
    if (error) {
      console.warn('pre_check_forms findByAppointmentId error:', error.message);
      return undefined;
    }
    return (data ?? undefined) as DbPreCheckForm | undefined;
  },

  async findById(id: string): Promise<DbPreCheckForm | undefined> {
    const { data, error } = await supabaseAdmin
      .from('pre_check_forms')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.warn('pre_check_forms findById error:', error.message);
      return undefined;
    }
    return (data ?? undefined) as DbPreCheckForm | undefined;
  },

  async create(data: {
    patient_id: string;
    appointment_id: string;
    has_allergies?: number;
    allergy_details?: string | null;
    has_chronic_conditions?: number;
    chronic_condition_details?: string | null;
    current_medications?: string | null;
    is_pregnant?: number;
    has_recent_surgery?: number;
    surgery_details?: string | null;
    blood_pressure_history?: string | null;
    diabetes_history?: string | null;
    heart_condition?: number;
    additional_notes?: string | null;
  }): Promise<DbPreCheckForm> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('pre_check_forms').insert({
      id,
      patient_id: data.patient_id,
      appointment_id: data.appointment_id,
      has_allergies: data.has_allergies ?? 0,
      allergy_details: data.allergy_details ?? null,
      has_chronic_conditions: data.has_chronic_conditions ?? 0,
      chronic_condition_details: data.chronic_condition_details ?? null,
      current_medications: data.current_medications ?? null,
      is_pregnant: data.is_pregnant ?? 0,
      has_recent_surgery: data.has_recent_surgery ?? 0,
      surgery_details: data.surgery_details ?? null,
      blood_pressure_history: data.blood_pressure_history ?? null,
      diabetes_history: data.diabetes_history ?? null,
      heart_condition: data.heart_condition ?? 0,
      additional_notes: data.additional_notes ?? null,
      status: 'pending',
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    return (await this.findById(id))!;
  },

  async submit(id: string): Promise<DbPreCheckForm | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('pre_check_forms')
      .update({ status: 'submitted', submitted_at: now, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async markReviewed(id: string): Promise<DbPreCheckForm | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('pre_check_forms')
      .update({ status: 'reviewed', updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async update(
    id: string,
    data: Partial<{
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
    }>
  ): Promise<DbPreCheckForm | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields = [
      'has_allergies', 'allergy_details', 'has_chronic_conditions', 'chronic_condition_details',
      'current_medications', 'is_pregnant', 'has_recent_surgery', 'surgery_details',
      'blood_pressure_history', 'diabetes_history', 'heart_condition', 'additional_notes',
    ] as const;

    for (const f of fields) {
      if (data[f] !== undefined) updates[f] = data[f] ?? null;
    }

    const { error } = await supabaseAdmin.from('pre_check_forms').update(updates).eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },
};
