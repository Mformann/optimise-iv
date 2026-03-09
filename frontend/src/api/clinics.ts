import apiClient from './client';
import { ApiResponse, Clinic, User } from '../types';

export const clinicsApi = {
  getAll: async (activeOnly = false): Promise<Clinic[]> => {
    const params = activeOnly ? { active: 'true' } : {};
    const response = await apiClient.get<ApiResponse<Clinic[]>>('/clinics', { params });
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Clinic> => {
    const response = await apiClient.get<ApiResponse<Clinic>>(`/clinics/${id}`);
    return response.data.data!;
  },

  getDoctors: async (clinicId: string): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>(`/clinics/${clinicId}/doctors`);
    return response.data.data || [];
  },

  create: async (data: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email?: string;
    location_type: 'clinic' | 'non_clinic';
  }): Promise<Clinic> => {
    const response = await apiClient.post<ApiResponse<Clinic>>('/clinics', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<{
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    location_type: 'clinic' | 'non_clinic';
    is_active: boolean;
  }>): Promise<Clinic> => {
    const response = await apiClient.put<ApiResponse<Clinic>>(`/clinics/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clinics/${id}`);
  },

  assignDoctor: async (clinicId: string, doctorId: string, isPrimary = false): Promise<void> => {
    await apiClient.post(`/clinics/${clinicId}/doctors`, {
      doctor_id: doctorId,
      is_primary: isPrimary,
    });
  },

  removeDoctor: async (clinicId: string, doctorId: string): Promise<void> => {
    await apiClient.delete(`/clinics/${clinicId}/doctors/${doctorId}`);
  },
};
