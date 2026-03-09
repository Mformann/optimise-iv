import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbNotification } from '../types/index.js';

export interface NotificationWithDetails extends DbNotification {
  appointment_patient_name?: string;
  appointment_date?: string;
  appointment_time?: string;
}

export const notificationRepository = {
  async findByUser(userId: string, unreadOnly = false): Promise<NotificationWithDetails[]> {
    let q = supabaseAdmin
      .from('notifications')
      .select(`
        *,
        appointments(
          scheduled_date,
          scheduled_time,
          patients(first_name, last_name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) q = q.eq('is_read', false);

    const { data, error } = await q;
    if (error) throw error;

    return ((data ?? []) as any[]).map((n) => ({
      ...n,
      appointment_patient_name: n.appointments?.patients
        ? `${n.appointments.patients.first_name} ${n.appointments.patients.last_name}`
        : undefined,
      appointment_date: n.appointments?.scheduled_date ?? undefined,
      appointment_time: n.appointments?.scheduled_time ?? undefined,
      appointments: undefined,
    })) as NotificationWithDetails[];
  },

  async findById(id: string): Promise<DbNotification | undefined> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbNotification | undefined;
  },

  async countUnread(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
  },

  async create(data: {
    user_id: string;
    appointment_id?: string | null;
    title: string;
    message: string;
    type?: 'appointment' | 'system' | 'reminder';
  }): Promise<DbNotification> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('notifications').insert({
      id,
      user_id: data.user_id,
      appointment_id: data.appointment_id ?? null,
      title: data.title,
      message: data.message,
      type: data.type ?? 'appointment',
      is_read: false,
      created_at: now,
    });
    if (error) throw error;

    return (await this.findById(id))!;
  },

  async markAsRead(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 1) > 0;
  },

  async markAllAsRead(userId: string): Promise<number> {
    const { error, count } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true }, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
  },

  async deleteByAppointment(appointmentId: string): Promise<number> {
    const { error, count } = await supabaseAdmin
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('appointment_id', appointmentId);
    if (error) throw error;
    return count ?? 0;
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async dismissForCompletedAppointment(appointmentId: string): Promise<number> {
    const { error, count } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true }, { count: 'exact' })
      .eq('appointment_id', appointmentId)
      .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
  },
};
