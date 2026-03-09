import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbInquiry, InquirySource, InquiryStatus } from '../types/index.js';

export interface InquiryWithDetails extends DbInquiry {
  partner_name: string;
  clinic_name: string;
  contacted_by_name?: string;
}

const INQUIRY_SELECT = `
  *,
  partners(name),
  clinics(name),
  users!inquiries_contacted_by_fkey(name)
`;

const mapInquiry = (i: any): InquiryWithDetails => ({
  ...i,
  partner_name: i.partners?.name ?? '',
  clinic_name: i.clinics?.name ?? '',
  contacted_by_name: i.users?.name ?? undefined,
  partners: undefined,
  clinics: undefined,
  users: undefined,
});

export const inquiryRepository = {
  async findAll(filters?: {
    partnerId?: string;
    clinicId?: string;
    status?: InquiryStatus;
  }): Promise<InquiryWithDetails[]> {
    let q = supabaseAdmin
      .from('inquiries')
      .select(INQUIRY_SELECT)
      .order('created_at', { ascending: false });

    if (filters?.partnerId) q = q.eq('partner_id', filters.partnerId);
    if (filters?.clinicId) q = q.eq('clinic_id', filters.clinicId);
    if (filters?.status) q = q.eq('status', filters.status);

    const { data, error } = await q;
    if (error) {
      console.warn('inquiries missing or error:', error.message);
      return [];
    }
    return ((data ?? []) as any[]).map(mapInquiry);
  },

  async findById(id: string): Promise<InquiryWithDetails | undefined> {
    const { data, error } = await supabaseAdmin
      .from('inquiries')
      .select(INQUIRY_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapInquiry(data) : undefined;
  },

  async create(data: {
    partner_id: string;
    clinic_id: string;
    client_name: string;
    client_phone: string;
    client_email?: string | null;
    source?: InquirySource;
    interest_notes?: string | null;
  }): Promise<InquiryWithDetails> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('inquiries').insert({
      id,
      partner_id: data.partner_id,
      clinic_id: data.clinic_id,
      client_name: data.client_name,
      client_phone: data.client_phone,
      client_email: data.client_email ?? null,
      source: data.source ?? 'other',
      interest_notes: data.interest_notes ?? null,
      status: 'new',
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    return (await this.findById(id))!;
  },

  async update(
    id: string,
    data: Partial<{
      client_name: string;
      client_phone: string;
      client_email: string | null;
      source: InquirySource;
      interest_notes: string | null;
      status: InquiryStatus;
    }>
  ): Promise<InquiryWithDetails | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.client_name !== undefined) updates.client_name = data.client_name;
    if (data.client_phone !== undefined) updates.client_phone = data.client_phone;
    if (data.client_email !== undefined) updates.client_email = data.client_email;
    if (data.source !== undefined) updates.source = data.source;
    if (data.interest_notes !== undefined) updates.interest_notes = data.interest_notes;
    if (data.status !== undefined) updates.status = data.status;

    if (Object.keys(updates).length <= 1) return existing; // only updated_at
    const { error } = await supabaseAdmin.from('inquiries').update(updates).eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async updateStatus(id: string, status: InquiryStatus): Promise<InquiryWithDetails | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('inquiries')
      .update({ status, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async markContacted(id: string, contactedBy: string): Promise<InquiryWithDetails | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('inquiries')
      .update({ status: 'contacted', contacted_by: contactedBy, contacted_at: now, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async convertToAppointment(
    id: string,
    patientId: string,
    appointmentId: string
  ): Promise<InquiryWithDetails | undefined> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('inquiries')
      .update({ status: 'converted', patient_id: patientId, appointment_id: appointmentId, updated_at: now })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async getStatsByPartner(partnerId: string): Promise<{
    total: number; new_count: number; contacted: number; converted: number; lost: number;
  }> {
    const { data, error } = await supabaseAdmin.rpc('get_inquiry_stats_by_partner', { p_partner_id: partnerId });
    if (error) {
      console.warn('get_inquiry_stats_by_partner rpc error:', error.message);
      return { total: 0, new_count: 0, contacted: 0, converted: 0, lost: 0 };
    }
    return data ?? { total: 0, new_count: 0, contacted: 0, converted: 0, lost: 0 };
  },

  async getStats(): Promise<{
    total: number; new_count: number; contacted: number; converted: number; lost: number;
  }> {
    const { data, error } = await supabaseAdmin.rpc('get_inquiry_stats');
    if (error) {
      console.warn('get_inquiry_stats rpc error:', error.message);
      return { total: 0, new_count: 0, contacted: 0, converted: 0, lost: 0 };
    }
    return data ?? { total: 0, new_count: 0, contacted: 0, converted: 0, lost: 0 };
  },
};
