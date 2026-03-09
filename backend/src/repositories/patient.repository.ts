import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbPatient } from '../types/index.js';

export const patientRepository = {
  async findAll(limit = 100, offset = 0): Promise<{ patients: DbPatient[]; total: number }> {
    const { data, error, count } = await supabaseAdmin
      .from('patients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      console.warn('patients missing or error:', error.message);
      return { patients: [], total: 0 };
    }
    return { patients: (data ?? []) as DbPatient[], total: count ?? 0 };
  },

  async findById(id: string): Promise<DbPatient | undefined> {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbPatient | undefined;
  },

  async search(searchQuery: string, limit = 20): Promise<DbPatient[]> {
    const term = `%${searchQuery}%`;
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .or(`first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`)
      .order('last_name')
      .order('first_name')
      .limit(limit);
    if (error) {
      console.warn('patients search error:', error.message);
      return [];
    }
    return (data ?? []) as DbPatient[];
  },

  async findByPhone(phone: string): Promise<DbPatient | undefined> {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbPatient | undefined;
  },

  async findReferrals(patientId: string): Promise<DbPatient[]> {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('referred_by_patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as DbPatient[];
  },

  async create(data: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone: string;
    date_of_birth?: string | null;
    address?: string | null;
    city?: string | null;
    medical_notes?: string | null;
    referral_source_id?: string | null;
    referred_by_patient_id?: string | null;
    partner_id?: string | null;
    blood_test_done?: boolean | number | null;
  }): Promise<DbPatient> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('patients').insert({
      id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email ?? null,
      phone: data.phone,
      date_of_birth: data.date_of_birth ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      medical_notes: data.medical_notes ?? null,
      referral_source_id: data.referral_source_id ?? null,
      referred_by_patient_id: data.referred_by_patient_id ?? null,
      partner_id: data.partner_id ?? null,
      blood_test_done: data.blood_test_done ? true : false,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    return (await this.findById(id))!;
  },

  async update(
    id: string,
    data: Partial<{
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
      blood_test_done: boolean | number | null;
    }>
  ): Promise<DbPatient | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const scalarFields = [
      'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
      'address', 'city', 'medical_notes', 'referral_source_id',
      'referred_by_patient_id', 'partner_id',
    ] as const;

    for (const field of scalarFields) {
      if (data[field] !== undefined) updates[field] = data[field] ?? null;
    }

    if (data.blood_test_done !== undefined) {
      updates.blood_test_done = data.blood_test_done ? true : false;
    }

    const { error } = await supabaseAdmin.from('patients').update(updates).eq('id', id);
    if (error) throw error;

    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('patients')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async countReferrals(patientId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by_patient_id', patientId);
    if (error) throw error;
    return count ?? 0;
  },
};
