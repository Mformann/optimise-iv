import { supabaseAdmin } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';

export interface WalletTransaction {
  id: string;
  patient_id: string;
  type: 'money_deposit' | 'money_spent' | 'drip_purchase' | 'drip_usage' | 'drip_expired' | 'drip_adjustment' | 'money_adjustment';
  amount: number;
  drip_id?: string;
  drip_quantity?: number;
  payment_method?: 'cash' | 'card' | 'transfer' | 'wallet' | 'admin_adjustment';
  description?: string;
  reference_id?: string;
  reference_type?: 'appointment' | 'drip_order' | 'manual';
  created_by?: string;
  created_at: string;
}

export interface DripBalance {
  id: string;
  patient_id: string;
  drip_id: string;
  drip_name: string;
  quantity: number;
  remaining_quantity: number;
  expires_at?: string;
  added_at: string;
}

export const getWalletBalance = async (patientId: string): Promise<number> => {
  const { data, error } = await supabaseAdmin
    .from('patient_wallets')
    .select('balance')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as any).balance : 0;
};

export const getDripBalances = async (patientId: string): Promise<DripBalance[]> => {
  const { data, error } = await supabaseAdmin
    .from('patient_drip_balances')
    .select('*, drips(name)')
    .eq('patient_id', patientId)
    // .eq('is_active', true) // Removed
    .gt('remaining_quantity', 0)
    .order('expires_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((b) => ({
    ...b,
    drip_name: b.drips?.name ?? '',
    drips: undefined,
  })) as DripBalance[];
};

export const getTransactions = async (patientId: string): Promise<WalletTransaction[]> => {
  const { data, error } = await supabaseAdmin
    .from('wallet_transactions')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WalletTransaction[];
};

// ---------------------------------------------------------------------------
// Transactional operations — each calls a Postgres stored procedure via RPC
// ---------------------------------------------------------------------------

export const addMoney = async (
  patientId: string,
  amount: number,
  method: 'cash' | 'card' | 'transfer',
  userId: string,
  description?: string
) => {
  const { error } = await supabaseAdmin.rpc('add_money_to_wallet', {
    p_patient_id: patientId,
    p_amount: amount,
    p_method: method,
    p_user_id: userId,
    p_description: description ?? null,
  });
  if (error) throw error;
  return { success: true };
};

export const buyDripWithWallet = async (
  patientId: string,
  dripId: string,
  quantity: number,
  totalCost: number,
  userId: string,
  expiresAt?: string
) => {
  const { error } = await supabaseAdmin.rpc('buy_drip_with_wallet', {
    p_patient_id: patientId,
    p_drip_id: dripId,
    p_quantity: quantity,
    p_total_cost: totalCost,
    p_user_id: userId,
    p_expires_at: expiresAt ?? null,
  });
  if (error) throw error;
  return { success: true };
};

export const buyDripDirect = async (
  patientId: string,
  dripId: string,
  quantity: number,
  totalCost: number,
  method: 'cash' | 'card' | 'transfer',
  userId: string,
  expiresAt?: string
) => {
  const { error } = await supabaseAdmin.rpc('buy_drip_direct', {
    p_patient_id: patientId,
    p_drip_id: dripId,
    p_quantity: quantity,
    p_total_cost: totalCost,
    p_method: method,
    p_user_id: userId,
    p_expires_at: expiresAt ?? null,
  });
  if (error) throw error;
  return { success: true };
};

export const spendWalletBalance = async (
  patientId: string,
  amount: number,
  userId: string,
  appointmentId: string,
  description: string,
  allowOverdraft = false
) => {
  const { data, error } = await supabaseAdmin.rpc('spend_wallet_balance', {
    p_patient_id: patientId,
    p_amount: amount,
    p_user_id: userId,
    p_reference_id: appointmentId,
    p_description: description,
    p_reference_type: 'appointment',
    p_allow_overdraft: allowOverdraft,
  });
  if (error) throw error;
  return { success: true, newBalance: (data as any)?.new_balance ?? 0 };
};

export const useDrip = async (
  patientId: string,
  dripId: string,
  quantityToUse: number,
  userId: string,
  appointmentId?: string
) => {
  const { error } = await supabaseAdmin.rpc('use_drip_credits', {
    p_patient_id: patientId,
    p_drip_id: dripId,
    p_quantity: quantityToUse,
    p_user_id: userId,
    p_appointment_id: appointmentId ?? null,
  });
  if (error) throw error;
  return { success: true };
};

// ---------------------------------------------------------------------------
// Internal helpers — called in-process by paymentRepository / offerRepository
// These also delegate to RPC to ensure atomicity.
// ---------------------------------------------------------------------------

export const addMoneyInternal = async (
  patientId: string,
  amount: number,
  method: 'cash' | 'card' | 'transfer',
  userId: string,
  description?: string
) => addMoney(patientId, amount, method, userId, description);

export const addDripBalanceInternal = async (
  patientId: string,
  dripId: string,
  quantity: number,
  totalCost: number,
  method: 'cash' | 'card' | 'transfer',
  userId: string,
  expiresAt?: string | null
) => {
  const { error } = await supabaseAdmin.rpc('add_drip_balance_internal', {
    p_patient_id: patientId,
    p_drip_id: dripId,
    p_quantity: quantity,
    p_total_cost: totalCost,
    p_method: method,
    p_user_id: userId,
    p_expires_at: expiresAt ?? null,
  });
  if (error) throw error;
  return { success: true };
};

export const spendWalletBalanceInternal = async (
  patientId: string,
  amount: number,
  userId: string,
  referenceId: string,
  description: string,
  referenceType: 'appointment' | 'drip_order' | 'manual' = 'appointment',
  allowOverdraft = false
) => {
  const { data, error } = await supabaseAdmin.rpc('spend_wallet_balance', {
    p_patient_id: patientId,
    p_amount: amount,
    p_user_id: userId,
    p_reference_id: referenceId,
    p_description: description,
    p_reference_type: referenceType,
    p_allow_overdraft: allowOverdraft,
  });
  if (error) throw error;
  return { success: true, newBalance: (data as any)?.new_balance ?? 0 };
};

export const useDripInternal = async (
  patientId: string,
  dripId: string,
  quantityToUse: number,
  userId: string,
  appointmentId?: string
) => useDrip(patientId, dripId, quantityToUse, userId, appointmentId);

export default {
  getWalletBalance,
  getDripBalances,
  getTransactions,
  addMoney,
  addMoneyInternal,
  addDripBalanceInternal,
  buyDripWithWallet,
  buyDripDirect,
  spendWalletBalance,
  spendWalletBalanceInternal,
  useDrip,
  useDripInternal,
};
