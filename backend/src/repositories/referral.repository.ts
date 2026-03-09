import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbReferralSource, DbReferralScheme } from '../types/index.js';

export interface ReferralReward {
  id: string;
  referrer_patient_id: string;
  referred_patient_id: string;
  scheme_id: string;
  status: 'pending' | 'claimed' | 'expired';
  created_at: string;
  claimed_at: string | null;
  referrer_name?: string;
  referred_name?: string;
  scheme_name?: string;
}

export const referralRepository = {
  // Referral Sources
  async findAllSources(activeOnly = false): Promise<DbReferralSource[]> {
    let q = supabaseAdmin.from('referral_sources').select('*').order('name');
    // if (activeOnly) q = q.eq('is_active', true); // Removed
    const { data, error } = await q;
    if (error) {
      console.warn('referral_sources missing or error:', error.message);
      return [];
    }
    return (data ?? []) as DbReferralSource[];
  },

  async findSourceById(id: string): Promise<DbReferralSource | undefined> {
    const { data, error } = await supabaseAdmin
      .from('referral_sources')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbReferralSource | undefined;
  },

  async createSource(data: { name: string; description?: string | null }): Promise<DbReferralSource> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('referral_sources').insert({
      id,
      name: data.name,
      description: data.description ?? null,
      // is_active: true, // Removed
      created_at: now,
    });
    if (error) throw error;
    return (await this.findSourceById(id))!;
  },

  async updateSource(
    id: string,
    data: Partial<{ name: string; description: string | null; is_active: boolean }>
  ): Promise<DbReferralSource | undefined> {
    const existing = await this.findSourceById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    // if (data.is_active !== undefined) updates.is_active = data.is_active; // Removed

    if (Object.keys(updates).length === 0) return existing;
    const { error } = await supabaseAdmin.from('referral_sources').update(updates).eq('id', id);
    if (error) throw error;
    return this.findSourceById(id);
  },

  async deleteSource(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('referral_sources')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  // Referral Schemes
  async findAllSchemes(activeOnly = false): Promise<DbReferralScheme[]> {
    try {
      let q = supabaseAdmin.from('referral_schemes').select('*').order('name');
      // if (activeOnly) q = q.eq('is_active', true); // Removed
      const { data, error } = await q;
      if (error) {
        console.warn('referral_schemes missing or error:', error.message);
        return [];
      }
      return (data ?? []) as DbReferralScheme[];
    } catch (error: any) {
      console.warn('referral_schemes missing or error:', error.message);
      return [];
    }
  },

  async findSchemeById(id: string): Promise<DbReferralScheme | undefined> {
    const { data, error } = await supabaseAdmin
      .from('referral_schemes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? undefined) as DbReferralScheme | undefined;
  },

  async createScheme(data: {
    name: string;
    description?: string | null;
    reward_type: 'discount' | 'free_therapy' | 'cash';
    reward_value: number;
    min_referrals: number;
  }): Promise<DbReferralScheme> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('referral_schemes').insert({
      id,
      name: data.name,
      description: data.description ?? null,
      reward_type: data.reward_type,
      reward_value: data.reward_value,
      min_referrals: data.min_referrals,
      // is_active: true, // Removed
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    return (await this.findSchemeById(id))!;
  },

  async updateScheme(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      reward_type: 'discount' | 'free_therapy' | 'cash';
      reward_value: number;
      min_referrals: number;
      is_active: boolean;
    }>
  ): Promise<DbReferralScheme | undefined> {
    const existing = await this.findSchemeById(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.reward_type !== undefined) updates.reward_type = data.reward_type;
    if (data.reward_value !== undefined) updates.reward_value = data.reward_value;
    if (data.min_referrals !== undefined) updates.min_referrals = data.min_referrals;
    // if (data.is_active !== undefined) updates.is_active = data.is_active; // Removed

    if (Object.keys(updates).length === 0) return existing;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin.from('referral_schemes').update(updates).eq('id', id);
    if (error) throw error;
    return this.findSchemeById(id);
  },

  async deleteScheme(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('referral_schemes')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  // Referral Rewards (dual-patient JOIN handled via RPC)
  async getRewards(patientId?: string): Promise<ReferralReward[]> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_referral_rewards', {
        p_patient_id: patientId ?? null,
      });
      if (error) {
        console.warn('referrals missing or error:', error.message);
        return [];
      }
      // Assuming mapReferral is defined elsewhere or data is already ReferralReward[]
      // If mapReferral is needed, it should be provided. For now, casting directly.
      return (data ?? []) as ReferralReward[];
    } catch (error: any) {
      console.warn('referrals missing or error:', error.message);
      return [];
    }
  },

  async createReward(data: {
    referrer_patient_id: string;
    referred_patient_id: string;
    scheme_id: string;
  }): Promise<ReferralReward> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('referral_rewards').insert({
      id,
      referrer_patient_id: data.referrer_patient_id,
      referred_patient_id: data.referred_patient_id,
      scheme_id: data.scheme_id,
      status: 'pending',
      created_at: now,
    });
    if (error) throw error;

    const { data: row, error: fe } = await supabaseAdmin
      .from('referral_rewards')
      .select('*')
      .eq('id', id)
      .single();
    if (fe) throw fe;
    return row as ReferralReward;
  },

  async claimReward(rewardId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const { error, count } = await supabaseAdmin
      .from('referral_rewards')
      .update({ status: 'claimed', claimed_at: now }, { count: 'exact' })
      .eq('id', rewardId)
      .eq('status', 'pending');
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
