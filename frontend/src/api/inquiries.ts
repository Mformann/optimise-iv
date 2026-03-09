import apiClient from './client';
import { ApiResponse, Inquiry, InquiryStatus } from '../types';

export const inquiriesApi = {
  getAll: async (filters?: {
    partnerId?: string;
    clinicId?: string;
    status?: InquiryStatus;
  }): Promise<Inquiry[]> => {
    const params: Record<string, string> = {};
    if (filters?.partnerId) params.partner_id = filters.partnerId;
    if (filters?.clinicId) params.clinic_id = filters.clinicId;
    if (filters?.status) params.status = filters.status;

    const response = await apiClient.get<ApiResponse<Inquiry[]>>('/inquiries', { params });
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Inquiry> => {
    const response = await apiClient.get<ApiResponse<Inquiry>>(`/inquiries/${id}`);
    return response.data.data!;
  },

  create: async (data: {
    partner_id: string;
    clinic_id: string;
    client_name: string;
    client_phone: string;
    client_email?: string;
    source?: string;
    interest_notes?: string;
  }): Promise<Inquiry> => {
    const response = await apiClient.post<ApiResponse<Inquiry>>('/inquiries', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<Inquiry>): Promise<Inquiry> => {
    const response = await apiClient.put<ApiResponse<Inquiry>>(`/inquiries/${id}`, data);
    return response.data.data!;
  },

  markContacted: async (id: string): Promise<Inquiry> => {
    const response = await apiClient.post<ApiResponse<Inquiry>>(`/inquiries/${id}/contact`);
    return response.data.data!;
  },

  convert: async (id: string, data: {
    doctor_id: string;
    therapy_id?: string;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes?: number;
    type?: string;
  }): Promise<{ inquiry: Inquiry; appointment: any; patient_id: string }> => {
    const response = await apiClient.post<ApiResponse<{ inquiry: Inquiry; appointment: any; patient_id: string }>>(`/inquiries/${id}/convert`, data);
    return response.data.data!;
  },

  getStats: async (partnerId?: string): Promise<{
    total: number;
    new_count: number;
    contacted: number;
    converted: number;
    lost: number;
  }> => {
    const params = partnerId ? { partner_id: partnerId } : {};
    const response = await apiClient.get<ApiResponse<{
      total: number;
      new_count: number;
      contacted: number;
      converted: number;
      lost: number;
    }>>('/inquiries/stats', { params });
    return response.data.data!;
  },
};
