import apiClient from './client';
import { ApiResponse, Offer, OfferRedemption } from '../types';

export const offersApi = {
  getAll: async (activeOnly = false): Promise<Offer[]> => {
    const params = activeOnly ? { active: 'true' } : {};
    const response = await apiClient.get<ApiResponse<Offer[]>>('/offers', { params });
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Offer> => {
    const response = await apiClient.get<ApiResponse<Offer>>(`/offers/${id}`);
    return response.data.data!;
  },

  getByCode: async (code: string): Promise<Offer> => {
    const response = await apiClient.get<ApiResponse<Offer>>(`/offers/code/${code}`);
    return response.data.data!;
  },

  create: async (data: Partial<Offer>): Promise<Offer> => {
    const response = await apiClient.post<ApiResponse<Offer>>('/offers', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<Offer>): Promise<Offer> => {
    const response = await apiClient.put<ApiResponse<Offer>>(`/offers/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/offers/${id}`);
  },

  redeem: async (id: string, data: {
    patient_id: string;
    payment_method: 'cash' | 'card' | 'transfer';
    custom_cost?: number;
    appointment_id?: string;
  }): Promise<OfferRedemption> => {
    const response = await apiClient.post<ApiResponse<OfferRedemption>>(`/offers/${id}/redeem`, data);
    return response.data.data!;
  },
};
