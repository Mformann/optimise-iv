import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbAppointment } from '../types/index.js';

export interface AppointmentWithDetails extends DbAppointment {
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  clinic_name: string;
  therapy_name?: string;
  nurse_name?: string;
  drips: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

// Supabase embedded select for appointment with all join data
const APPT_SELECT = `
  *,
  patients!appointments_patient_id_fkey(first_name, last_name, phone),
  doctor:users!appointments_doctor_id_fkey(name),
  clinics(name),
  therapies(name),
  nurse:users!appointments_nurse_id_fkey(name)
`;

const mapAppointment = (a: any): Omit<AppointmentWithDetails, 'drips'> => ({
  ...a,
  patient_name: a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : '',
  patient_phone: a.patients?.phone ?? '',
  doctor_name: a.doctor?.name ?? '',
  clinic_name: a.clinics?.name ?? '',
  therapy_name: a.therapies?.name ?? undefined,
  nurse_name: a.nurse?.name ?? undefined,
  patients: undefined,
  doctor: undefined,
  clinics: undefined,
  therapies: undefined,
  nurse: undefined,
});

/** Fetch drips for a list of appointment IDs and group them by appointment_id */
const fetchDripsForAppointments = async (
  ids: string[]
): Promise<Map<string, { id: string; name: string; quantity: number; price: number }[]>> => {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('appointment_drips')
    .select('appointment_id, quantity, price_at_time, drips(id, name)')
    .in('appointment_id', ids);

  if (error) throw error;

  const map = new Map<string, { id: string; name: string; quantity: number; price: number }[]>();
  for (const row of (data ?? []) as any[]) {
    const apptId = row.appointment_id;
    if (!map.has(apptId)) map.set(apptId, []);
    map.get(apptId)!.push({
      id: row.drips?.id,
      name: row.drips?.name,
      quantity: row.quantity,
      price: row.price_at_time,
    });
  }
  return map;
};

export const appointmentRepository = {
  async checkOverlap(
    doctorId: string,
    date: string,
    startTime: string,
    durationMinutes: number,
    excludeId?: string
  ): Promise<boolean> {
    // Use an RPC for time-based overlap — Supabase query builder can't express PostgreSQL time arithmetic
    const { data, error } = await supabaseAdmin.rpc('check_appointment_overlap', {
      p_doctor_id: doctorId,
      p_date: date,
      p_start_time: startTime,
      p_duration_minutes: durationMinutes,
      p_exclude_id: excludeId ?? null,
    });
    if (error) throw error;
    return data === true;
  },

  async findAll(
    filters?: {
      doctorId?: string;
      clinicId?: string;
      patientId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      isNonClinic?: boolean;
      nurseId?: string;
    },
    limit = 100,
    offset = 0
  ): Promise<{ appointments: AppointmentWithDetails[]; total: number }> {
    let q = supabaseAdmin
      .from('appointments')
      .select(APPT_SELECT, { count: 'exact' })
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.doctorId) q = q.eq('doctor_id', filters.doctorId);
    if (filters?.clinicId) q = q.eq('clinic_id', filters.clinicId);
    if (filters?.patientId) q = q.eq('patient_id', filters.patientId);
    if (filters?.date) q = q.eq('scheduled_date', filters.date);
    if (filters?.startDate) q = q.gte('scheduled_date', filters.startDate);
    if (filters?.endDate) q = q.lte('scheduled_date', filters.endDate);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.isNonClinic !== undefined) q = q.eq('is_non_clinic', filters.isNonClinic);
    if (filters?.nurseId) q = q.eq('nurse_id', filters.nurseId);

    const { data, error, count } = await q;
    if (error) {
      console.warn('appointments missing or error:', error.message);
      return { appointments: [], total: 0 };
    }

    if (!data || data.length === 0) return { appointments: [], total: count ?? 0 };

    const ids = data.map((a: any) => a.id);
    const dripsMap = await fetchDripsForAppointments(ids);

    const appointments = (data as any[]).map((a) => ({
      ...mapAppointment(a),
      drips: dripsMap.get(a.id) ?? [],
    })) as AppointmentWithDetails[];

    return { appointments, total: count ?? 0 };
  },

  async findById(id: string): Promise<AppointmentWithDetails | undefined> {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(APPT_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;

    const base = mapAppointment(data);

    // Fetch appointment drips
    let drips: { id: string; name: string; quantity: number; price: number }[] = [];
    const { data: dripData, error: de } = await supabaseAdmin
      .from('appointment_drips')
      .select('quantity, price_at_time, drips(id, name)')
      .eq('appointment_id', id);

    if (de) throw de;

    drips = ((dripData ?? []) as any[]).map((d) => ({
      id: d.drips?.id,
      name: d.drips?.name,
      quantity: d.quantity,
      price: d.price_at_time,
    }));

    // Fallback to therapy default drips if no appointment drips recorded yet
    if (drips.length === 0 && base.therapy_id) {
      const { data: td, error: te } = await supabaseAdmin
        .from('therapy_drips')
        .select('quantity, drips(id, name, price)')
        .eq('therapy_id', base.therapy_id);
      if (te) throw te;

      drips = ((td ?? []) as any[]).map((d) => ({
        id: d.drips?.id,
        name: d.drips?.name,
        quantity: d.quantity,
        price: d.drips?.price,
      }));
    }

    return { ...base, drips } as AppointmentWithDetails;
  },

  async findByDateRange(
    startDate: string,
    endDate: string,
    doctorId?: string,
    clinicId?: string
  ): Promise<AppointmentWithDetails[]> {
    let q = supabaseAdmin
      .from('appointments')
      .select(APPT_SELECT)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date')
      .order('scheduled_time');

    if (doctorId) q = q.eq('doctor_id', doctorId);
    if (clinicId) q = q.eq('clinic_id', clinicId);

    const { data, error } = await q;
    if (error) {
      console.warn('appointments findByDateRange error:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];

    const ids = (data as any[]).map((a) => a.id);
    const dripsMap = await fetchDripsForAppointments(ids);

    return (data as any[]).map((a) => ({
      ...mapAppointment(a),
      drips: dripsMap.get(a.id) ?? [],
    })) as AppointmentWithDetails[];
  },

  async findTodayByDoctor(doctorId: string): Promise<AppointmentWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.findByDateRange(today, today, doctorId);
  },

  async create(data: {
    patient_id: string;
    doctor_id: string;
    clinic_id: string;
    therapy_id?: string | null;
    type: 'consulting' | 'drip';
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes?: number;
    is_quick?: boolean;
    notes?: string | null;
    created_by: string;
  }): Promise<AppointmentWithDetails> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('appointments').insert({
      id,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      clinic_id: data.clinic_id,
      therapy_id: data.therapy_id ?? null,
      type: data.type,
      status: 'scheduled',
      scheduled_date: data.scheduled_date,
      scheduled_time: data.scheduled_time,
      duration_minutes: data.duration_minutes ?? 30,
      is_quick: data.is_quick ?? false,
      notes: data.notes ?? null,
      created_by: data.created_by,
      created_at: now,
      updated_at: now,
      final_price: 0,
    });
    if (error) throw error;

    return (await this.findById(id))!;
  },

  async startSession(id: string): Promise<AppointmentWithDetails | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'in_progress', actual_start_at: now, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async completeSession(
    id: string,
    data: {
      remarks?: string;
      completion_notes?: string;
      final_price?: number;
      drips?: { drip_id: string; quantity: number; price: number }[];
      skip_drip_credit_deduction?: boolean;
    }
  ): Promise<AppointmentWithDetails | undefined> {
    const now = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'completed',
        actual_end_at: now,
        remarks: data.remarks ?? null,
        completion_notes: data.completion_notes ?? null,
        final_price: data.final_price ?? 0,
        payment_status: 'unpaid',
        updated_at: now,
      })
      .eq('id', id);
    if (updateErr) throw updateErr;

    // Determine drips to record
    let dripsToRecord = data.drips;

    if (!dripsToRecord || dripsToRecord.length === 0) {
      // Fall back to therapy default drips
      const appt = await this.findById(id);
      if (appt?.therapy_id) {
        const { data: td, error: te } = await supabaseAdmin
          .from('therapy_drips')
          .select('drip_id, quantity, drips(price)')
          .eq('therapy_id', appt.therapy_id);
        if (te) throw te;
        dripsToRecord = ((td ?? []) as any[]).map((d) => ({
          drip_id: d.drip_id,
          quantity: d.quantity,
          price: d.drips?.price ?? 0,
        }));
      }
    }

    if (dripsToRecord && dripsToRecord.length > 0) {
      for (const drip of dripsToRecord) {
        const { error: de } = await supabaseAdmin.from('appointment_drips').insert({
          id: uuidv4(),
          appointment_id: id,
          drip_id: drip.drip_id,
          quantity: drip.quantity,
          price_at_time: drip.price,
          created_at: now,
        });
        if (de) throw de;

        // Deduct physical stock
        const { error: se } = await supabaseAdmin.rpc('increment_drip_stock', {
          p_drip_id: drip.drip_id,
          p_change: -drip.quantity,
        });
        if (se) throw se;
      }
    }

    return this.findById(id);
  },

  async updateStatus(
    id: string,
    status: DbAppointment['status'],
    completionNotes?: string
  ): Promise<AppointmentWithDetails | undefined> {
    if (status === 'in_progress') return this.startSession(id);
    if (status === 'completed') return this.completeSession(id, { completion_notes: completionNotes });

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ status, completion_notes: completionNotes ?? null, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async update(
    id: string,
    data: Partial<{
      doctor_id: string;
      clinic_id: string;
      therapy_id: string | null;
      type: 'consulting' | 'drip';
      scheduled_date: string;
      scheduled_time: string;
      duration_minutes: number;
      notes: string | null;
    }>
  ): Promise<AppointmentWithDetails | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.doctor_id !== undefined) updates.doctor_id = data.doctor_id;
    if (data.clinic_id !== undefined) updates.clinic_id = data.clinic_id;
    if (data.therapy_id !== undefined) updates.therapy_id = data.therapy_id;
    if (data.type !== undefined) updates.type = data.type;
    if (data.scheduled_date !== undefined) updates.scheduled_date = data.scheduled_date;
    if (data.scheduled_time !== undefined) updates.scheduled_time = data.scheduled_time;
    if (data.duration_minutes !== undefined) updates.duration_minutes = data.duration_minutes;
    if (data.notes !== undefined) updates.notes = data.notes;

    const { error } = await supabaseAdmin.from('appointments').update(updates).eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('appointments')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async createNonClinic(data: {
    patient_id: string;
    doctor_id: string;
    clinic_id: string;
    therapy_id?: string | null;
    type: 'consulting' | 'drip';
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes?: number;
    notes?: string | null;
    created_by: string;
    inquiry_id?: string | null;
  }): Promise<AppointmentWithDetails> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('appointments').insert({
      id,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      clinic_id: data.clinic_id,
      therapy_id: data.therapy_id ?? null,
      type: data.type,
      status: 'pending_precheck',
      scheduled_date: data.scheduled_date,
      scheduled_time: data.scheduled_time,
      duration_minutes: data.duration_minutes ?? 60,
      is_quick: false,
      notes: data.notes ?? null,
      created_by: data.created_by,
      created_at: now,
      updated_at: now,
      final_price: 0,
      is_non_clinic: true,
      inquiry_id: data.inquiry_id ?? null,
    });
    if (error) throw error;
    return (await this.findById(id))!;
  },

  async assignNurse(id: string, nurseId: string): Promise<AppointmentWithDetails | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ nurse_id: nurseId, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async updateNonClinicStatus(id: string, status: string): Promise<AppointmentWithDetails | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ status, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async findNonClinicPipeline(): Promise<AppointmentWithDetails[]> {
    const EXCLUDED = ['completed', 'cancelled'];
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(APPT_SELECT)
      .eq('is_non_clinic', true)
      .not('status', 'in', `(${EXCLUDED.join(',')})`)
      .order('scheduled_date')
      .order('scheduled_time');

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const ids = (data as any[]).map((a) => a.id);
    const dripsMap = await fetchDripsForAppointments(ids);

    return (data as any[]).map((a) => ({
      ...mapAppointment(a),
      drips: dripsMap.get(a.id) ?? [],
    })) as AppointmentWithDetails[];
  },

  async findByNurse(nurseId: string): Promise<AppointmentWithDetails[]> {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(APPT_SELECT)
      .eq('nurse_id', nurseId)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const ids = (data as any[]).map((a) => a.id);
    const dripsMap = await fetchDripsForAppointments(ids);

    return (data as any[]).map((a) => ({
      ...mapAppointment(a),
      drips: dripsMap.get(a.id) ?? [],
    })) as AppointmentWithDetails[];
  },

  async getStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    no_show: number;
  }> {
    const { data, error } = await supabaseAdmin.rpc('get_appointment_stats', {
      p_start_date: startDate ?? null,
      p_end_date: endDate ?? null,
    });
    if (error) throw error;
    return data ?? { total: 0, scheduled: 0, completed: 0, cancelled: 0, no_show: 0 };
  },
};
