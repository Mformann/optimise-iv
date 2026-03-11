import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbOffer, DbOfferRedemption } from '../types/index.js';
import { addMoneyInternal, addDripBalanceInternal } from './walletRepository.js';

export interface OfferWithDripName extends DbOffer {
  drip_name?: string;
}

/**
 * Parse a relative duration pattern like "+90 days" and return an ISO date string.
 */
const computeExpiresAt = (pattern: string): string => {
  const match = pattern.match(/^\+?(\d+)\s*(days?|months?|years?)$/i);
  if (!match) throw new Error(`Invalid expires_at_pattern: ${pattern}`);

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const date = new Date();

  if (unit.startsWith('day')) date.setDate(date.getDate() + amount);
  else if (unit.startsWith('month')) date.setMonth(date.getMonth() + amount);
  else if (unit.startsWith('year')) date.setFullYear(date.getFullYear() + amount);

  return date.toISOString();
};

export const offerRepository = {
  async findAll(activeOnly = false): Promise<OfferWithDripName[]> {
    let q = supabaseAdmin
      .from('offers')
      .select('*, drips(name)')
      .order('name');
    // if (activeOnly) q = q.eq('is_active', true); // Removed
    const { data, error } = await q;
    if (error) {
      console.warn('offers missing or error:', error.message);
      return [];
    }
    return ((data ?? []) as any[]).map((o) => ({
      ...o,
      drip_name: o.drips?.name ?? undefined,
      drips: undefined,
    })) as OfferWithDripName[];
  },

  async findById(id: string): Promise<OfferWithDripName | undefined> {
    const { data, error } = await supabaseAdmin
      .from('offers')
      .select('*, drips(name)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const o = data as any;
    return { ...o, drip_name: o.drips?.name ?? undefined, drips: undefined } as OfferWithDripName;
  },

  async findByCode(code: string): Promise<OfferWithDripName | undefined> {
    const { data, error } = await supabaseAdmin
      .from('offers')
      .select('*, drips(name)')
      .eq('code', code)
      // .eq('is_active', true) // Removed
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const o = data as any;
    return { ...o, drip_name: o.drips?.name ?? undefined, drips: undefined } as OfferWithDripName;
  },

  async create(data: {
    name: string;
    description?: string | null;
    type: 'money' | 'drip';
    cost: number;
    value?: number | null;
    drips?: { drip_id: string; quantity: number }[] | null;
    drip_id?: string | null;
    drip_quantity?: number | null;
    expires_at_pattern?: string | null;
    code?: string | null;
    fixed_value?: boolean;
  }): Promise<OfferWithDripName> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('offers').insert({
      id,
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      cost: data.cost,
      value: data.value ?? null,
      drips: data.drips ? JSON.parse(JSON.stringify(data.drips)) : null,
      drip_id: data.drip_id ?? null,
      drip_quantity: data.drip_quantity ?? null,
      expires_at_pattern: data.expires_at_pattern ?? null,
      code: data.code ?? null,
      fixed_value: data.fixed_value === false ? 0 : 1,
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
      description: string | null;
      type: 'money' | 'drip';
      cost: number;
      value: number | null;
      drips: { drip_id: string; quantity: number }[] | null;
      drip_id: string | null;
      drip_quantity: number | null;
      expires_at_pattern: string | null;
      code: string | null;
      fixed_value: boolean;
      is_active: boolean;
    }>
  ): Promise<OfferWithDripName | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.type !== undefined) updates.type = data.type;
    if (data.cost !== undefined) updates.cost = data.cost;
    if (data.value !== undefined) updates.value = data.value;
    if (data.drips !== undefined) updates.drips = data.drips ? JSON.parse(JSON.stringify(data.drips)) : null;
    if (data.drip_id !== undefined) updates.drip_id = data.drip_id;
    if (data.drip_quantity !== undefined) updates.drip_quantity = data.drip_quantity;
    if (data.expires_at_pattern !== undefined) updates.expires_at_pattern = data.expires_at_pattern;
    if (data.code !== undefined) updates.code = data.code ?? null;
    if (data.fixed_value !== undefined) updates.fixed_value = data.fixed_value ? 1 : 0;
    // if (data.is_active !== undefined) updates.is_active = data.is_active; // Removed

    const { error } = await supabaseAdmin.from('offers').update(updates).eq('id', id);
    if (error) throw error;
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('offers')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  /**
   * Apply/redeem an offer for a patient.
   * Delegates the full atomic transaction to the `redeem_offer` Postgres RPC.
   */
  async redeem(
    offerId: string,
    patientId: string,
    userId: string,
    paymentMethod: 'cash' | 'card' | 'transfer',
    customCost?: number,
    appointmentId?: string
  ): Promise<DbOfferRedemption> {
    const { data, error } = await supabaseAdmin.rpc('redeem_offer', {
      p_offer_id: offerId,
      p_patient_id: patientId,
      p_user_id: userId,
      p_payment_method: paymentMethod,
      p_custom_cost: customCost ?? null,
      p_appointment_id: appointmentId ?? null,
    });
    if (error) throw error;
    return data as DbOfferRedemption;
  },
};
