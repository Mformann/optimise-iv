import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbUser, UserRole } from '../types/index.js';

export const userRepository = {
  async findAll(role?: UserRole): Promise<DbUser[]> {
    let q = supabaseAdmin.from('users').select('*').order('name');
    if (role) q = q.eq('role', role);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as DbUser[];
  },

  async findById(id: string): Promise<DbUser | undefined> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbUser | undefined;
  },

  async findByEmail(email: string): Promise<DbUser | undefined> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbUser | undefined;
  },

  async findDoctors(): Promise<DbUser[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'doctor')
      // .eq('is_active', true) // Removed due to missing db column
      .order('name');
    if (error) {
      console.warn('users missing or error:', error.message);
      return [];
    }
    return (data ?? []) as DbUser[];
  },

  async findNurses(): Promise<DbUser[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'nurse')
      // .eq('is_active', true) // Removed due to missing db column
      .order('name');
    if (error) throw error;
    return (data ?? []) as DbUser[];
  },

  async findDoctorsByClinic(clinicId: string): Promise<DbUser[]> {
    // Join through doctor_clinics junction table
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*, doctor_clinics!inner(clinic_id)')
      .eq('doctor_clinics.clinic_id', clinicId)
      // .eq('is_active', true) // Removed due to missing db column
      .order('name');
    if (error) throw error;
    // Strip out the embedded join data; only return the user fields
    return ((data ?? []) as any[]).map(({ doctor_clinics: _dc, ...u }) => u) as DbUser[];
  },

  async create(data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone?: string;
    nurse_type?: 'inhouse' | 'freelancer';
    permissions?: string[];
  }): Promise<DbUser> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('users').insert({
      id,
      email: data.email,
      password_hash: passwordHash,
      name: data.name,
      role: data.role,
      phone: data.phone ?? null,
      nurse_type: data.nurse_type ?? null,
      permissions: data.permissions ? JSON.stringify(data.permissions) : null,
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
      email?: string;
      password?: string;
      name?: string;
      role?: UserRole;
      phone?: string;
      is_active?: boolean;
      nurse_type?: 'inhouse' | 'freelancer';
    }
  ): Promise<DbUser | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (data.email !== undefined) updates.email = data.email;
    if (data.password !== undefined) updates.password_hash = await bcrypt.hash(data.password, 10);
    if (data.name !== undefined) updates.name = data.name;
    if (data.role !== undefined) updates.role = data.role;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.nurse_type !== undefined) updates.nurse_type = data.nurse_type;
    // if (data.is_active !== undefined) updates.is_active = data.is_active; // Removed due to missing db column

    const { error } = await supabaseAdmin.from('users').update(updates).eq('id', id);
    if (error) throw error;

    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('users')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async verifyPassword(user: DbUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  },
};
