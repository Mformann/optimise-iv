import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbPartner } from '../types/index.js';

export interface PartnerCommission {
  id: string;
  partner_id: string;
  patient_id: string;
  appointment_id: string | null;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
  paid_at: string | null;
  patient_name?: string;
}

export const partnerRepository = {
  async findAll(activeOnly = false): Promise<DbPartner[]> {
    let q = supabaseAdmin.from('partners').select('*').order('name');
    // if (activeOnly) q = q.eq('is_active', true); // Removed
    const { data, error } = await q;
    if (error) {
      console.warn('partners missing or error:', error.message);
      return [];
    }
    return (data ?? []) as DbPartner[];
  },

  async findById(id: string): Promise<DbPartner | undefined> {
    const { data, error } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbPartner | undefined;
  },

  async create(data: {
    name: string;
    contact_name?: string | null;
    email?: string | null;
    phone?: string | null;
    commission_type: 'percentage' | 'fixed';
    commission_value: number;
    venue_type?: string | null;
    clinic_id?: string | null;
  }): Promise<DbPartner> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('partners').insert({
      id,
      name: data.name,
      contact_name: data.contact_name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      commission_type: data.commission_type,
      commission_value: data.commission_value,
      venue_type: data.venue_type ?? null,
      clinic_id: data.clinic_id ?? null,
      // is_active: true, // Removed
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    return (await this.findById(id))!;
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      contact_name: string | null;
      email: string | null;
      phone: string | null;
      commission_type: 'percentage' | 'fixed';
      commission_value: number;
      is_active: boolean;
      venue_type: string | null;
      clinic_id: string | null;
    }>
  ): Promise<DbPartner | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.contact_name !== undefined) updates.contact_name = data.contact_name;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.commission_type !== undefined) updates.commission_type = data.commission_type;
    if (data.commission_value !== undefined) updates.commission_value = data.commission_value;
    // if (data.is_active !== undefined) updates.is_active = data.is_active; // Removed
    if (data.venue_type !== undefined) updates.venue_type = data.venue_type;
    if (data.clinic_id !== undefined) updates.clinic_id = data.clinic_id;

    const { error } = await supabaseAdmin.from('partners').update(updates).eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('partners')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async getCommissions(partnerId: string): Promise<PartnerCommission[]> {
    const { data, error } = await supabaseAdmin
      .from('partner_commissions')
      .select('*, patients(first_name, last_name)')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return ((data ?? []) as any[]).map((c) => ({
      ...c,
      patient_name: c.patients
        ? `${c.patients.first_name} ${c.patients.last_name}`
        : undefined,
      patients: undefined,
    })) as PartnerCommission[];
  },

  async createCommission(data: {
    partner_id: string;
    patient_id: string;
    appointment_id?: string | null;
    amount: number;
  }): Promise<PartnerCommission> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('partner_commissions').insert({
      id,
      partner_id: data.partner_id,
      patient_id: data.patient_id,
      appointment_id: data.appointment_id ?? null,
      amount: data.amount,
      status: 'pending',
      created_at: now,
    });
    if (error) throw error;

    const { data: row, error: fe } = await supabaseAdmin
      .from('partner_commissions')
      .select('*')
      .eq('id', id)
      .single();
    if (fe) throw fe;
    return row as PartnerCommission;
  },

  async markCommissionPaid(commissionId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const { error, count } = await supabaseAdmin
      .from('partner_commissions')
      .update({ status: 'paid', paid_at: now }, { count: 'exact' })
      .eq('id', commissionId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async getCommissionStats(
    partnerId: string
  ): Promise<{ total: number; pending: number; paid: number }> {
    const { data, error } = await supabaseAdmin.rpc('get_partner_commission_stats', {
      p_partner_id: partnerId,
    });
    if (error) throw error;
    return data ?? { total: 0, pending: 0, paid: 0 };
  },

  async getHostReport(
    partnerId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    inquiry_count: number;
    converted_count: number;
    conversion_rate: number;
    appointment_count: number;
    completed_count: number;
    total_revenue: number;
    total_commission: number;
    pending_commission: number;
  }> {
    const { data, error } = await supabaseAdmin.rpc('get_partner_host_report', {
      p_partner_id: partnerId,
      p_start_date: startDate ?? null,
      p_end_date: endDate ?? null,
    });
    if (error) throw error;
    return (
      data ?? {
        inquiry_count: 0,
        converted_count: 0,
        conversion_rate: 0,
        appointment_count: 0,
        completed_count: 0,
        total_revenue: 0,
        total_commission: 0,
        pending_commission: 0,
      }
    );
  },
};
