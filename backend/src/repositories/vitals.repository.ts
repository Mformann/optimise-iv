import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbVitals, VitalsDecision } from '../types/index.js';

export interface VitalsWithDetails extends DbVitals {
  nurse_name: string;
  patient_name?: string;
}

const VITALS_SELECT = `
  *,
  users!vitals_nurse_id_fkey(name),
  appointments!vitals_appointment_id_fkey(
    patients(first_name, last_name)
  )
`;

const mapVitals = (v: any): VitalsWithDetails => ({
  ...v,
  nurse_name: v.users?.name ?? '',
  patient_name: v.appointments?.patients
    ? `${v.appointments.patients.first_name} ${v.appointments.patients.last_name}`
    : undefined,
  users: undefined,
  appointments: undefined,
});

export const vitalsRepository = {
  async findByAppointmentId(appointmentId: string): Promise<VitalsWithDetails | undefined> {
    const { data, error } = await supabaseAdmin
      .from('vitals')
      .select(VITALS_SELECT)
      .eq('appointment_id', appointmentId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapVitals(data) : undefined;
  },

  async findById(id: string): Promise<VitalsWithDetails | undefined> {
    const { data, error } = await supabaseAdmin
      .from('vitals')
      .select(VITALS_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapVitals(data) : undefined;
  },

  async create(data: {
    appointment_id: string;
    nurse_id: string;
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    heart_rate?: number | null;
    temperature?: number | null;
    oxygen_saturation?: number | null;
    blood_sugar?: number | null;
    weight?: number | null;
    decision: VitalsDecision;
    abnormal_notes?: string | null;
  }): Promise<VitalsWithDetails> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('vitals').insert({
      id,
      appointment_id: data.appointment_id,
      nurse_id: data.nurse_id,
      blood_pressure_systolic: data.blood_pressure_systolic ?? null,
      blood_pressure_diastolic: data.blood_pressure_diastolic ?? null,
      heart_rate: data.heart_rate ?? null,
      temperature: data.temperature ?? null,
      oxygen_saturation: data.oxygen_saturation ?? null,
      blood_sugar: data.blood_sugar ?? null,
      weight: data.weight ?? null,
      decision: data.decision,
      abnormal_notes: data.abnormal_notes ?? null,
      recorded_at: now,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    return (await this.findById(id))!;
  },

  async findByNurse(nurseId: string): Promise<VitalsWithDetails[]> {
    const { data, error } = await supabaseAdmin
      .from('vitals')
      .select(VITALS_SELECT)
      .eq('nurse_id', nurseId)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as any[]).map(mapVitals);
  },
};
