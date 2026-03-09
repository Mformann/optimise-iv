import apiClient from './client';
import { ApiResponse, PaginatedResponse, Appointment, AppointmentType } from '../types';

export interface PaymentBreakdownResponse {
  drips: {
    drip_id: string;
    drip_name: string;
    quantity_needed: number;
    quantity_from_credits: number;
    quantity_to_pay: number;
    unit_price: number;
    credit_value: number;
    payment_value: number;
  }[];
  totals: {
    total_amount: number;
    covered_by_credits: number;
    remaining_to_pay: number;
    wallet_balance: number;
    can_pay_from_wallet: boolean;
  };
}

export interface PaymentInfo {
  use_credits?: boolean;
  use_wallet?: boolean;
  wallet_amount?: number;
  cash_amount?: number;
  card_amount?: number;
}

export const appointmentsApi = {
  getAppointments: async (filters?: {
    doctorId?: string;
    clinicId?: string;
    patientId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Appointment>> => {
    const params: Record<string, string | number> = {};
    if (filters?.doctorId) params.doctor_id = filters.doctorId;
    if (filters?.clinicId) params.clinic_id = filters.clinicId;
    if (filters?.patientId) params.patient_id = filters.patientId;
    if (filters?.date) params.date = filters.date;
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;
    if (filters?.status) params.status = filters.status;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const response = await apiClient.get<PaginatedResponse<Appointment>>('/appointments', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Appointment> => {
    const response = await apiClient.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    return response.data.data!;
  },

  getCalendar: async (startDate: string, endDate: string, doctorId?: string, clinicId?: string): Promise<Appointment[]> => {
    const params: Record<string, string> = { start_date: startDate, end_date: endDate };
    if (doctorId) params.doctor_id = doctorId;
    if (clinicId) params.clinic_id = clinicId;

    const response = await apiClient.get<ApiResponse<Appointment[]>>('/appointments/calendar', { params });
    return response.data.data || [];
  },

  getToday: async (doctorId?: string): Promise<Appointment[]> => {
    const params = doctorId ? { doctor_id: doctorId } : {};
    const response = await apiClient.get<ApiResponse<Appointment[]>>('/appointments/today', { params });
    return response.data.data || [];
  },

  getStats: async (startDate?: string, endDate?: string): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    no_show: number;
  }> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await apiClient.get<ApiResponse<{
      total: number;
      scheduled: number;
      completed: number;
      cancelled: number;
      no_show: number;
    }>>('/appointments/stats', { params });
    return response.data.data!;
  },

  createAppointment: async (data: {
    patient_id: string;
    doctor_id: string;
    clinic_id: string;
    therapy_id?: string;
    type: AppointmentType;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes?: number;
    is_quick?: boolean;
    notes?: string;
  }): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>('/appointments', data);
    return response.data.data!;
  },

  createQuick: async (data: {
    patient_id: string;
    doctor_id: string;
    clinic_id: string;
    therapy_id?: string;
    type: AppointmentType;
    notes?: string;
  }): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>('/appointments/quick', data);
    return response.data.data!;
  },

  updateAppointment: async (id: string, data: Partial<{
    doctor_id: string;
    clinic_id: string;
    therapy_id: string;
    type: AppointmentType;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes: number;
    notes: string;
  }>): Promise<Appointment> => {
    const response = await apiClient.put<ApiResponse<Appointment>>(`/appointments/${id}`, data);
    return response.data.data!;
  },

  updateStatus: async (id: string, status: string, completionNotes?: string): Promise<Appointment> => {
    const response = await apiClient.put<ApiResponse<Appointment>>(`/appointments/${id}/status`, {
      status,
      completion_notes: completionNotes,
    });
    return response.data.data!;
  },

  start: async (id: string): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>(`/appointments/${id}/start`);
    return response.data.data!;
  },

  getPaymentPreview: async (id: string, drips: { drip_id: string; quantity: number; price: number }[]): Promise<PaymentBreakdownResponse> => {
    const response = await apiClient.post<ApiResponse<PaymentBreakdownResponse>>(`/appointments/${id}/payment-preview`, { drips });
    return response.data.data!;
  },

  complete: async (id: string, data: {
    completion_notes?: string;
    remarks?: string;
    final_price?: number;
    drips?: { drip_id: string; quantity: number; price: number }[];
    payment?: PaymentInfo;
  }): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>(`/appointments/${id}/complete`, data);
    return response.data.data!;
  },

  cancelAppointment: async (id: string): Promise<Appointment> => {
    const response = await apiClient.patch<ApiResponse<Appointment>>(`/appointments/${id}/cancel`);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/appointments/${id}`);
  },

  // Non-clinic workflow
  createNonClinic: async (data: {
    patient_id: string;
    doctor_id: string;
    clinic_id: string;
    therapy_id?: string;
    type?: string;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes?: number;
    notes?: string;
    inquiry_id?: string;
  }): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>('/appointments/non-clinic', data);
    return response.data.data!;
  },

  getNonClinicPipeline: async (): Promise<Appointment[]> => {
    const response = await apiClient.get<ApiResponse<Appointment[]>>('/appointments/non-clinic/pipeline');
    return response.data.data || [];
  },

  assignNurse: async (id: string, nurseId: string): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>(`/appointments/${id}/assign-nurse`, { nurse_id: nurseId });
    return response.data.data!;
  },

  markPreparing: async (id: string): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>(`/appointments/${id}/preparing`);
    return response.data.data!;
  },

  markDispatched: async (id: string): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>(`/appointments/${id}/dispatch`);
    return response.data.data!;
  },
};

