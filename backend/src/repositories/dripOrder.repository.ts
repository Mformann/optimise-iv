import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbDripOrder } from '../types/index.js';

export interface DripOrderFilters {
  status?: string;
  clinic_id?: string;
  patient_id?: string;
  prescribed_by?: string;
  delivered_by?: string;
}

export interface DripOrderWithDetails extends DbDripOrder {
  patient_name?: string;
  patient_phone?: string;
  drip_name?: string;
  drip_price?: number;
  prescribed_by_name?: string;
  delivered_by_name?: string;
  clinic_name?: string;
}

const ORDER_SELECT = `
  *,
  patients(first_name, last_name, phone),
  drips(name, price),
  prescriber:users!drip_orders_prescribed_by_fkey(name),
  deliverer:users!drip_orders_delivered_by_fkey(name),
  clinics(name)
`;

const mapOrder = (o: any): DripOrderWithDetails => ({
  ...o,
  patient_name: o.patients ? `${o.patients.first_name} ${o.patients.last_name}` : undefined,
  patient_phone: o.patients?.phone ?? undefined,
  drip_name: o.drips?.name ?? undefined,
  drip_price: o.drips?.price ?? undefined,
  prescribed_by_name: o.prescriber?.name ?? undefined,
  delivered_by_name: o.deliverer?.name ?? undefined,
  clinic_name: o.clinics?.name ?? undefined,
  patients: undefined,
  drips: undefined,
  prescriber: undefined,
  deliverer: undefined,
  clinics: undefined,
});

export const dripOrderRepository = {
  async findAll(filters: DripOrderFilters = {}): Promise<DripOrderWithDetails[]> {
    let q = supabaseAdmin
      .from('drip_orders')
      .select(ORDER_SELECT)
      .order('prescribed_at', { ascending: false });

    if (filters.status) q = q.eq('status', filters.status);
    if (filters.clinic_id) q = q.eq('clinic_id', filters.clinic_id);
    if (filters.patient_id) q = q.eq('patient_id', filters.patient_id);
    if (filters.prescribed_by) q = q.eq('prescribed_by', filters.prescribed_by);
    if (filters.delivered_by) q = q.eq('delivered_by', filters.delivered_by);

    const { data, error } = await q;
    if (error) {
      console.warn('drip_orders missing or error:', error.message);
      return [];
    }
    return ((data ?? []) as any[]).map(mapOrder);
  },

  async findById(id: string): Promise<DripOrderWithDetails | undefined> {
    const { data, error } = await supabaseAdmin
      .from('drip_orders')
      .select(ORDER_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapOrder(data) : undefined;
  },

  async findPendingByClinic(clinicId?: string): Promise<DripOrderWithDetails[]> {
    let q = supabaseAdmin
      .from('drip_orders')
      .select(ORDER_SELECT)
      .eq('status', 'pending')
      .order('prescribed_at');

    if (clinicId) q = q.eq('clinic_id', clinicId);
    const { data, error } = await q;
    if (error) throw error;
    return ((data ?? []) as any[]).map(mapOrder);
  },

  async create(data: {
    patient_id: string;
    drip_id: string;
    quantity: number;
    prescribed_by: string;
    clinic_id: string;
    appointment_id?: string | null;
    notes?: string | null;
  }): Promise<DripOrderWithDetails> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('drip_orders').insert({
      id,
      patient_id: data.patient_id,
      drip_id: data.drip_id,
      quantity: data.quantity,
      prescribed_by: data.prescribed_by,
      clinic_id: data.clinic_id,
      appointment_id: data.appointment_id ?? null,
      status: 'pending',
      notes: data.notes ?? null,
      prescribed_at: now,
    });
    if (error) throw error;
    return (await this.findById(id))!;
  },

  async updateStatus(
    id: string,
    status: string,
    data: {
      delivered_by?: string;
      delivery_notes?: string | null;
      delivered_at?: string;
    } = {}
  ): Promise<DripOrderWithDetails | undefined> {
    const updates: Record<string, unknown> = { status };
    if (data.delivered_by) updates.delivered_by = data.delivered_by;
    if (data.delivery_notes !== undefined) updates.delivery_notes = data.delivery_notes;
    if (data.delivered_at) updates.delivered_at = data.delivered_at;

    const { error } = await supabaseAdmin.from('drip_orders').update(updates).eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async cancel(id: string): Promise<DripOrderWithDetails | undefined> {
    return this.updateStatus(id, 'cancelled');
  },

  async getStats(clinicId?: string): Promise<{
    pending: number;
    in_progress: number;
    delivered_today: number;
    cancelled: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Run four count queries in parallel
    const makeQ = (status: string) => {
      let q = supabaseAdmin
        .from('drip_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      if (clinicId) q = q.eq('clinic_id', clinicId);
      return q;
    };

    const deliveredQ = (() => {
      let q = supabaseAdmin
        .from('drip_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered')
        .gte('delivered_at', today)
        .lt('delivered_at', today + 'T23:59:59.999Z');
      if (clinicId) q = q.eq('clinic_id', clinicId);
      return q;
    })();

    const [pending, inProgress, deliveredToday, cancelled] = await Promise.all([
      makeQ('pending'),
      makeQ('in_progress'),
      deliveredQ,
      makeQ('cancelled'),
    ]);

    if (pending.error) console.warn('drip_orders pending error:', pending.error.message);
    if (inProgress.error) console.warn('drip_orders inProgress error:', inProgress.error.message);
    if (deliveredToday.error) console.warn('drip_orders deliveredToday error:', deliveredToday.error.message);
    if (cancelled.error) console.warn('drip_orders cancelled error:', cancelled.error.message);

    return {
      pending: !pending.error ? (pending.count ?? 0) : 0,
      in_progress: !inProgress.error ? (inProgress.count ?? 0) : 0,
      delivered_today: !deliveredToday.error ? (deliveredToday.count ?? 0) : 0,
      cancelled: !cancelled.error ? (cancelled.count ?? 0) : 0,
    };
  },

  async findByPatient(patientId: string): Promise<DripOrderWithDetails[]> {
    const { data, error } = await supabaseAdmin
      .from('drip_orders')
      .select(ORDER_SELECT)
      .eq('patient_id', patientId)
      .order('prescribed_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as any[]).map(mapOrder);
  },
};
