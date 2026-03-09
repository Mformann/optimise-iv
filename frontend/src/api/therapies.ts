import apiClient from './client';
import { ApiResponse, Therapy } from '../types';

export const therapiesApi = {
  getAll: async (activeOnly = false): Promise<Therapy[]> => {
    const params = activeOnly ? { active: 'true' } : {};
    const response = await apiClient.get<ApiResponse<Therapy[]>>('/therapies', { params });
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Therapy> => {
    const response = await apiClient.get<ApiResponse<Therapy>>(`/therapies/${id}`);
    return response.data.data!;
  },

  create: async (data: {
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
  }): Promise<Therapy> => {
    const response = await apiClient.post<ApiResponse<Therapy>>('/therapies', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<{
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    is_active: boolean;
  }>): Promise<Therapy> => {
    const response = await apiClient.put<ApiResponse<Therapy>>(`/therapies/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/therapies/${id}`);
  },
};
