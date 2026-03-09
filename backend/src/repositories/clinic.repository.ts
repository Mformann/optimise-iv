import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbClinic, DbDoctorClinic } from '../types/index.js';

export const clinicRepository = {
  async findAll(activeOnly = false): Promise<DbClinic[]> {
    let q = supabaseAdmin.from('clinics').select('*').order('name');
    // if (activeOnly) q = q.eq('is_active', true); // Removed due to missing db column
    const { data, error } = await q;
    if (error) {
      console.warn('clinics missing or error:', error.message);
      return [];
    }
    return (data ?? []) as DbClinic[];
  },

  async findById(id: string): Promise<DbClinic | undefined> {
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbClinic | undefined;
  },

  async findByDoctor(doctorId: string): Promise<DbClinic[]> {
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('*, doctor_clinics!inner(doctor_id, is_primary)')
      .eq('doctor_clinics.doctor_id', doctorId)
      // .eq('is_active', true) // Removed due to missing db column
      .order('name');
    if (error) throw error;
    // Sort: primary clinics first, then by name (already ordered by name above)
    const rows = ((data ?? []) as any[]).map(({ doctor_clinics, ...clinic }) => ({
      ...clinic,
      _is_primary: (doctor_clinics as any[])?.[0]?.is_primary ?? false,
    }));
    rows.sort((a, b) => (b._is_primary ? 1 : 0) - (a._is_primary ? 1 : 0));
    return rows.map(({ _is_primary: _, ...c }) => c) as DbClinic[];
  },

  async create(data: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email?: string;
    location_type: 'clinic' | 'non_clinic';
  }): Promise<DbClinic> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('clinics').insert({
      id,
      name: data.name,
      address: data.address,
      city: data.city,
      phone: data.phone,
      email: data.email ?? null,
      location_type: data.location_type,
      // is_active: true, // Removed due to missing db column
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    return (await this.findById(id))!;
  },

  async update(
    id: string,
    data: {
      name?: string;
      address?: string;
      city?: string;
      phone?: string;
      email?: string;
      location_type?: 'clinic' | 'non_clinic';
      is_active?: boolean;
    }
  ): Promise<DbClinic | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.email !== undefined) updates.email = data.email;
    if (data.location_type !== undefined) updates.location_type = data.location_type;
    // if (data.is_active !== undefined) updates.is_active = data.is_active; // Removed due to missing db column

    const { error } = await supabaseAdmin.from('clinics').update(updates).eq('id', id);
    if (error) throw error;

    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('clinics')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  // Doctor-Clinic assignments
  async getDoctorAssignments(clinicId: string): Promise<DbDoctorClinic[]> {
    const { data, error } = await supabaseAdmin
      .from('doctor_clinics')
      .select('*')
      .eq('clinic_id', clinicId);
    if (error) throw error;
    return (data ?? []) as DbDoctorClinic[];
  },

  async assignDoctor(clinicId: string, doctorId: string, isPrimary = false): Promise<DbDoctorClinic> {
    const now = new Date().toISOString();

    // If setting as primary, unset other primaries for this doctor
    if (isPrimary) {
      const { error: unsetErr } = await supabaseAdmin
        .from('doctor_clinics')
        .update({ is_primary: false })
        .eq('doctor_id', doctorId);
      if (unsetErr) throw unsetErr;
    }

    // Upsert the assignment (insert or update on conflict)
    const { error } = await supabaseAdmin
      .from('doctor_clinics')
      .upsert(
        {
          id: uuidv4(),
          doctor_id: doctorId,
          clinic_id: clinicId,
          is_primary: isPrimary,
          created_at: now,
        },
        { onConflict: 'doctor_id,clinic_id', ignoreDuplicates: false }
      );
    if (error) throw error;

    const { data, error: fetchErr } = await supabaseAdmin
      .from('doctor_clinics')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('clinic_id', clinicId)
      .single();
    if (fetchErr) throw fetchErr;
    return data as DbDoctorClinic;
  },

  async removeDoctor(clinicId: string, doctorId: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('doctor_clinics')
      .delete({ count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
