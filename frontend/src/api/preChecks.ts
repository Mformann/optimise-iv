import apiClient from './client';
import { ApiResponse, PreCheckForm } from '../types';

export const preChecksApi = {
  getByAppointment: async (appointmentId: string): Promise<PreCheckForm> => {
    const response = await apiClient.get<ApiResponse<PreCheckForm>>(`/pre-checks/appointment/${appointmentId}`);
    return response.data.data!;
  },

  create: async (data: {
    patient_id: string;
    appointment_id: string;
    has_allergies?: boolean;
    allergy_details?: string;
    has_chronic_conditions?: boolean;
    chronic_condition_details?: string;
    current_medications?: string;
    is_pregnant?: boolean;
    has_recent_surgery?: boolean;
    surgery_details?: string;
    blood_pressure_history?: string;
    diabetes_history?: string;
    heart_condition?: boolean;
    additional_notes?: string;
  }): Promise<PreCheckForm> => {
    // Convert booleans to 0/1 for backend
    const payload = {
      ...data,
      has_allergies: data.has_allergies ? 1 : 0,
      has_chronic_conditions: data.has_chronic_conditions ? 1 : 0,
      is_pregnant: data.is_pregnant ? 1 : 0,
      has_recent_surgery: data.has_recent_surgery ? 1 : 0,
      heart_condition: data.heart_condition ? 1 : 0,
    };
    const response = await apiClient.post<ApiResponse<PreCheckForm>>('/pre-checks', payload);
    return response.data.data!;
  },

  submit: async (id: string, data?: Record<string, any>): Promise<PreCheckForm> => {
    const payload = data ? {
      ...data,
      has_allergies: data.has_allergies ? 1 : 0,
      has_chronic_conditions: data.has_chronic_conditions ? 1 : 0,
      is_pregnant: data.is_pregnant ? 1 : 0,
      has_recent_surgery: data.has_recent_surgery ? 1 : 0,
      heart_condition: data.heart_condition ? 1 : 0,
    } : {};
    const response = await apiClient.post<ApiResponse<PreCheckForm>>(`/pre-checks/${id}/submit`, payload);
    return response.data.data!;
  },
};
