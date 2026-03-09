import apiClient from './client';
import { ApiResponse, PaginatedResponse, Patient } from '../types';

export const patientsApi = {
  getPatients: async (page = 1, limit = 20): Promise<PaginatedResponse<Patient>> => {
    const response = await apiClient.get<PaginatedResponse<Patient>>('/patients', {
      params: { page, limit },
    });
    return response.data;
  },

  getPatient: async (id: string): Promise<Patient> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/${id}`);
    return response.data.data!;
  },

  searchPatients: async (query: string): Promise<Patient[]> => {
    const response = await apiClient.get<ApiResponse<Patient[]>>('/patients/search', {
      params: { q: query },
    });
    return response.data.data || [];
  },

  createPatient: async (data: {
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
    date_of_birth?: string;
    address?: string;
    city?: string;
    medical_notes?: string;
    referral_source_id?: string;
    referred_by_patient_id?: string;
    partner_id?: string;
    blood_test_done?: boolean;
  }): Promise<Patient> => {
    const response = await apiClient.post<ApiResponse<Patient>>('/patients', data);
    return response.data.data!;
  },

  updatePatient: async (id: string, data: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    address: string;
    city: string;
    medical_notes: string;
    referral_source_id: string;
    referred_by_patient_id: string;
    partner_id: string;
    blood_test_done: boolean;
  }>): Promise<Patient> => {
    const response = await apiClient.put<ApiResponse<Patient>>(`/patients/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/patients/${id}`);
  },
};

