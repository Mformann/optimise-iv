import apiClient from './client';
import { ApiResponse, Vitals, VitalsDecision } from '../types';

export const vitalsApi = {
  getByAppointment: async (appointmentId: string): Promise<Vitals> => {
    const response = await apiClient.get<ApiResponse<Vitals>>(`/vitals/appointment/${appointmentId}`);
    return response.data.data!;
  },

  recordVitals: async (data: {
    appointment_id: string;
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    heart_rate?: number;
    temperature?: number;
    oxygen_saturation?: number;
    blood_sugar?: number;
    weight?: number;
    decision: VitalsDecision;
    abnormal_notes?: string;
  }): Promise<Vitals> => {
    const response = await apiClient.post<ApiResponse<Vitals>>('/vitals', data);
    return response.data.data!;
  },
};
