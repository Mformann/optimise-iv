import { supabaseAdmin } from '../lib/supabase.js';
import {
  getWalletBalance,
  getDripBalances,
  useDripInternal,
  spendWalletBalanceInternal,
  DripBalance,
} from './walletRepository.js';

export interface DripPaymentDetail {
  drip_id: string;
  drip_name: string;
  quantity_needed: number;
  quantity_from_credits: number;
  quantity_to_pay: number;
  unit_price: number;
  credit_value: number;
  payment_value: number;
}

export interface PaymentBreakdown {
  drips: DripPaymentDetail[];
  totals: {
    total_amount: number;
    covered_by_credits: number;
    remaining_to_pay: number;
    wallet_balance: number;
    can_pay_from_wallet: boolean;
  };
}

export interface PaymentInfo {
  use_credits: boolean;
  use_wallet: boolean;
  wallet_amount?: number;
  cash_amount?: number;
  card_amount?: number;
  pay_later?: boolean;
}

export interface ProcessPaymentResult {
  success: boolean;
  credits_used: { drip_id: string; quantity: number }[];
  wallet_spent: number;
  cash_received: number;
  card_received: number;
  total_paid: number;
}

export interface CompletionData {
  completion_notes?: string;
  remarks?: string;
  final_price?: number;
  drips?: { drip_id: string; quantity: number; price: number }[];
  payment_status: 'unpaid' | 'partial' | 'paid' | 'pay_later';
}

export interface DeliveryData {
  orderId: string;
  dripId: string;
  quantity: number;
  deliveredBy: string;
  deliveryNotes?: string | null;
}

/**
 * Calculate payment breakdown for drips, checking available credits.
 * This is a pure computation function — no DB writes.
 */
export const calculatePaymentBreakdown = async (
  patientId: string,
  drips: { drip_id: string; quantity: number; price: number }[]
): Promise<PaymentBreakdown> => {
  const [dripBalances, walletBalance] = await Promise.all([
    getDripBalances(patientId),
    getWalletBalance(patientId),
  ]);

  // Build drip name map
  if (drips.length === 0) {
    return {
      drips: [],
      totals: {
        total_amount: 0,
        covered_by_credits: 0,
        remaining_to_pay: 0,
        wallet_balance: walletBalance,
        can_pay_from_wallet: true,
      },
    };
  }

  const dripIds = drips.map((d) => d.drip_id);
  const { data: dripInfo, error } = await supabaseAdmin
    .from('drips')
    .select('id, name')
    .in('id', dripIds);
  if (error) throw error;

  const dripNameMap = new Map((dripInfo ?? []).map((d: any) => [d.id, d.name]));

  // Aggregate available credits per drip type (FIFO — already ordered by expires_at)
  const availableCreditsMap = new Map<string, number>();
  for (const balance of dripBalances) {
    const current = availableCreditsMap.get(balance.drip_id) || 0;
    availableCreditsMap.set(balance.drip_id, current + balance.remaining_quantity);
  }

  const dripDetails: DripPaymentDetail[] = drips.map((drip) => {
    const availableCredits = availableCreditsMap.get(drip.drip_id) || 0;
    const quantityFromCredits = Math.min(drip.quantity, availableCredits);
    const quantityToPay = drip.quantity - quantityFromCredits;

    return {
      drip_id: drip.drip_id,
      drip_name: dripNameMap.get(drip.drip_id) || 'Unknown Drip',
      quantity_needed: drip.quantity,
      quantity_from_credits: quantityFromCredits,
      quantity_to_pay: quantityToPay,
      unit_price: drip.price,
      credit_value: quantityFromCredits * drip.price,
      payment_value: quantityToPay * drip.price,
    };
  });

  const totalAmount = dripDetails.reduce((s, d) => s + d.quantity_needed * d.unit_price, 0);
  const coveredByCredits = dripDetails.reduce((s, d) => s + d.credit_value, 0);
  const remainingToPay = dripDetails.reduce((s, d) => s + d.payment_value, 0);

  return {
    drips: dripDetails,
    totals: {
      total_amount: totalAmount,
      covered_by_credits: coveredByCredits,
      remaining_to_pay: remainingToPay,
      wallet_balance: walletBalance,
      can_pay_from_wallet: walletBalance >= remainingToPay,
    },
  };
};

/**
 * Process payment for an appointment session or drip order delivery.
 * Delegates the atomic transaction to the `process_payment` Postgres RPC.
 */
export const processPayment = async (
  patientId: string,
  referenceId: string,
  drips: { drip_id: string; quantity: number; price: number }[],
  payment: PaymentInfo,
  userId: string,
  referenceType: 'appointment' | 'drip_order' = 'appointment',
  completionData?: CompletionData,
  deliveryData?: DeliveryData
): Promise<ProcessPaymentResult> => {
  const { data, error } = await supabaseAdmin.rpc('process_payment', {
    p_patient_id: patientId,
    p_reference_id: referenceId,
    p_drips: JSON.stringify(drips),
    p_payment: JSON.stringify(payment),
    p_user_id: userId,
    p_reference_type: referenceType,
    p_completion_data: completionData ? JSON.stringify(completionData) : null,
    p_delivery_data: deliveryData ? JSON.stringify(deliveryData) : null,
  });
  if (error) throw error;
  return data as ProcessPaymentResult;
};

/**
 * Validate that payment covers the remaining amount (pure computation — no async needed).
 */
export const validatePayment = (
  breakdown: PaymentBreakdown,
  payment: PaymentInfo
): { valid: boolean; message?: string } => {
  const { remaining_to_pay, wallet_balance } = breakdown.totals;

  if (remaining_to_pay === 0) return { valid: true };

  let totalPaymentProvided = 0;

  if (payment.use_wallet && payment.wallet_amount) {
    if (payment.wallet_amount > wallet_balance) {
      return { valid: false, message: 'Wallet amount exceeds available balance' };
    }
    totalPaymentProvided += payment.wallet_amount;
  }

  if (payment.cash_amount) totalPaymentProvided += payment.cash_amount;
  if (payment.card_amount) totalPaymentProvided += payment.card_amount;
  if (payment.pay_later) return { valid: true };

  if (totalPaymentProvided < remaining_to_pay) {
    return {
      valid: false,
      message: `Payment of $${totalPaymentProvided.toFixed(2)} does not cover remaining amount of $${remaining_to_pay.toFixed(2)}`,
    };
  }

  return { valid: true };
};

export default {
  calculatePaymentBreakdown,
  processPayment,
  validatePayment,
};
