import apiClient from './client';
import { ApiResponse, DripOrder } from '../types';
import { PaymentBreakdownData } from '../components/sessions/PaymentBreakdown';

export const dripOrdersApi = {
  getAll: async (params?: { status?: string; clinic_id?: string; patient_id?: string }): Promise<DripOrder[]> => {
    const response = await apiClient.get<ApiResponse<DripOrder[]>>('/drip-orders', { params });
    return response.data.data || [];
  },

  getPending: async (clinicId?: string): Promise<DripOrder[]> => {
    const params = clinicId ? { clinic_id: clinicId } : {};
    const response = await apiClient.get<ApiResponse<DripOrder[]>>('/drip-orders/pending', { params });
    return response.data.data || [];
  },

  getStats: async (clinicId?: string): Promise<{ pending: number; in_progress: number; delivered_today: number; cancelled: number }> => {
    const params = clinicId ? { clinic_id: clinicId } : {};
    const response = await apiClient.get<ApiResponse<{ pending: number; in_progress: number; delivered_today: number; cancelled: number }>>('/drip-orders/stats', { params });
    return response.data.data!;
  },

  getById: async (id: string): Promise<DripOrder> => {
    const response = await apiClient.get<ApiResponse<DripOrder>>(`/drip-orders/${id}`);
    return response.data.data!;
  },

  getByPatient: async (patientId: string): Promise<DripOrder[]> => {
    const response = await apiClient.get<ApiResponse<DripOrder[]>>(`/drip-orders/patient/${patientId}`);
    return response.data.data || [];
  },

  getPaymentPreview: async (id: string): Promise<PaymentBreakdownData> => {
    const response = await apiClient.get<ApiResponse<PaymentBreakdownData>>(`/drip-orders/${id}/payment-preview`);
    return response.data.data!;
  },

  create: async (data: {
    patient_id: string;
    drip_id: string;
    quantity: number;
    clinic_id: string;
    appointment_id?: string;
    notes?: string;
  }): Promise<DripOrder> => {
    const response = await apiClient.post<ApiResponse<DripOrder>>('/drip-orders', data);
    return response.data.data!;
  },

  createBatch: async (data: {
    patient_id: string;
    clinic_id: string;
    appointment_id?: string;
    notes?: string;
    drips: { drip_id: string; quantity: number }[];
  }): Promise<DripOrder[]> => {
    const response = await apiClient.post<ApiResponse<DripOrder[]>>('/drip-orders/batch', data);
    return response.data.data || [];
  },

  deliver: async (id: string, data: {
    delivery_notes?: string;
    payment?: {
      use_credits?: boolean;
      use_wallet?: boolean;
      wallet_amount?: number;
      cash_amount?: number;
      card_amount?: number;
      pay_later?: boolean;
    };
  }): Promise<DripOrder> => {
    const response = await apiClient.post<ApiResponse<DripOrder>>(`/drip-orders/${id}/deliver`, data);
    return response.data.data!;
  },

  cancel: async (id: string): Promise<DripOrder> => {
    const response = await apiClient.post<ApiResponse<DripOrder>>(`/drip-orders/${id}/cancel`);
    return response.data.data!;
  },
};
