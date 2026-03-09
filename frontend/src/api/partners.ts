import apiClient from './client';
import { ApiResponse, Partner, CommissionType, HostReport } from '../types';

interface Commission {
  id: string;
  partner_id: string;
  patient_id: string;
  appointment_id?: string;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
  paid_at?: string;
  patient_name?: string;
}

export const partnersApi = {
  getAll: async (activeOnly = false): Promise<Partner[]> => {
    const params = activeOnly ? { active: 'true' } : {};
    const response = await apiClient.get<ApiResponse<Partner[]>>('/partners', { params });
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Partner> => {
    const response = await apiClient.get<ApiResponse<Partner>>(`/partners/${id}`);
    return response.data.data!;
  },

  create: async (data: {
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    commission_type: CommissionType;
    commission_value: number;
  }): Promise<Partner> => {
    const response = await apiClient.post<ApiResponse<Partner>>('/partners', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<{
    name: string;
    contact_name: string;
    email: string;
    phone: string;
    commission_type: CommissionType;
    commission_value: number;
    is_active: boolean;
  }>): Promise<Partner> => {
    const response = await apiClient.put<ApiResponse<Partner>>(`/partners/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/partners/${id}`);
  },

  getCommissions: async (partnerId: string): Promise<Commission[]> => {
    const response = await apiClient.get<ApiResponse<Commission[]>>(`/partners/${partnerId}/commissions`);
    return response.data.data || [];
  },

  markCommissionPaid: async (partnerId: string, commissionId: string): Promise<void> => {
    await apiClient.put(`/partners/${partnerId}/commissions/${commissionId}/paid`);
  },

  getHostReport: async (partnerId: string, startDate?: string, endDate?: string): Promise<HostReport> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get<ApiResponse<HostReport>>(`/partners/${partnerId}/host-report`, { params });
    return response.data.data!;
  },
};
