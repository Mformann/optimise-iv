import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbTherapy } from '../types/index.js';

export interface TherapyWithDrips extends DbTherapy {
  drips: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

export const therapyRepository = {
  async findAll(activeOnly = false): Promise<TherapyWithDrips[]> {
    let q = supabaseAdmin
      .from('therapies')
      .select('*, therapy_drips(quantity, drips(id, name, price))')
      .order('name');
    // if (activeOnly) q = q.eq('is_active', true); // Removed
    const { data, error } = await q;
    if (error) {
      console.warn('therapies missing or error:', error.message);
      return [];
    }

    return ((data ?? []) as any[]).map((t) => ({
      ...t,
      drips: (t.therapy_drips ?? []).map((td: any) => ({
        id: td.drips?.id,
        name: td.drips?.name,
        quantity: td.quantity,
        price: td.drips?.price,
      })),
      therapy_drips: undefined,
    })) as TherapyWithDrips[];
  },

  async findById(id: string): Promise<TherapyWithDrips | undefined> {
    const { data, error } = await supabaseAdmin
      .from('therapies')
      .select('*, therapy_drips(quantity, drips(id, name, price))')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;

    const t = data as any;
    return {
      ...t,
      drips: (t.therapy_drips ?? []).map((td: any) => ({
        id: td.drips?.id,
        name: td.drips?.name,
        quantity: td.quantity,
        price: td.drips?.price,
      })),
      therapy_drips: undefined,
    } as TherapyWithDrips;
  },

  async create(data: {
    name: string;
    description?: string | null;
    duration_minutes: number;
    price: number;
    drips?: { drip_id: string; quantity: number }[];
  }): Promise<TherapyWithDrips> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('therapies').insert({
      id,
      name: data.name,
      description: data.description ?? null,
      duration_minutes: data.duration_minutes,
      price: data.price,
      // is_active: true, // Removed
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    if (data.drips && data.drips.length > 0) {
      const dripRows = data.drips.map((d) => ({
        id: uuidv4(),
        therapy_id: id,
        drip_id: d.drip_id,
        quantity: d.quantity,
        created_at: now,
      }));
      const { error: de } = await supabaseAdmin.from('therapy_drips').insert(dripRows);
      if (de) throw de;
    }

    return (await this.findById(id))!;
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      duration_minutes: number;
      price: number;
      is_active: boolean;
      drips: { drip_id: string; quantity: number }[];
    }>
  ): Promise<TherapyWithDrips | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.duration_minutes !== undefined) updates.duration_minutes = data.duration_minutes;
    if (data.price !== undefined) updates.price = data.price;
    // if (data.is_active !== undefined) updates.is_active = data.is_active; // Removed

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabaseAdmin.from('therapies').update(updates).eq('id', id);
      if (error) throw error;
    }

    if (data.drips !== undefined) {
      // Refresh drips: delete old, insert new
      const { error: de } = await supabaseAdmin
        .from('therapy_drips')
        .delete()
        .eq('therapy_id', id);
      if (de) throw de;

      if (data.drips.length > 0) {
        const now = new Date().toISOString();
        const dripRows = data.drips.map((d) => ({
          id: uuidv4(),
          therapy_id: id,
          drip_id: d.drip_id,
          quantity: d.quantity,
          created_at: now,
        }));
        const { error: de2 } = await supabaseAdmin.from('therapy_drips').insert(dripRows);
        if (de2) throw de2;
      }
    }

    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('therapies')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
