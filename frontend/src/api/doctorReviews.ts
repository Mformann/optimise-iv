import apiClient from './client';
import { ApiResponse, DoctorReview, DoctorReviewDecision, DoctorFinalDecision } from '../types';

export const doctorReviewsApi = {
  getPendingReviews: async (doctorId?: string): Promise<{
    reviews: DoctorReview[];
    pending_appointments: { appointment_id: string; patient_name: string; clinic_name: string; scheduled_date: string }[];
  }> => {
    const params = doctorId ? { doctor_id: doctorId } : {};
    const response = await apiClient.get<ApiResponse<{
      reviews: DoctorReview[];
      pending_appointments: { appointment_id: string; patient_name: string; clinic_name: string; scheduled_date: string }[];
    }>>('/doctor-reviews/pending', { params });
    return response.data.data!;
  },

  getByAppointment: async (appointmentId: string): Promise<DoctorReview> => {
    const response = await apiClient.get<ApiResponse<DoctorReview>>(`/doctor-reviews/appointment/${appointmentId}`);
    return response.data.data!;
  },

  createReview: async (data: {
    appointment_id: string;
    decision: DoctorReviewDecision;
    risk_factors?: string;
    notes?: string;
  }): Promise<DoctorReview> => {
    const response = await apiClient.post<ApiResponse<DoctorReview>>('/doctor-reviews', data);
    return response.data.data!;
  },

  completeDoctorCall: async (id: string, data: {
    call_notes: string;
    final_decision: DoctorFinalDecision;
  }): Promise<DoctorReview> => {
    const response = await apiClient.post<ApiResponse<DoctorReview>>(`/doctor-reviews/${id}/complete-call`, data);
    return response.data.data!;
  },
};
