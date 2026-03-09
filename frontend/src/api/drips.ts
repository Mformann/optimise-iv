import apiClient from './client';
import { ApiResponse, Drip } from '../types';

export const dripsApi = {
    getAll: async (activeOnly = false): Promise<Drip[]> => {
        const params = { active: activeOnly };
        const response = await apiClient.get<ApiResponse<Drip[]>>('/drips', { params });
        return response.data.data || [];
    },

    getById: async (id: string): Promise<Drip> => {
        const response = await apiClient.get<ApiResponse<Drip>>(`/drips/${id}`);
        return response.data.data!;
    },

    create: async (data: Omit<Drip, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Drip> => {
        const response = await apiClient.post<ApiResponse<Drip>>('/drips', data);
        return response.data.data!;
    },

    update: async (id: string, data: Partial<Drip>): Promise<Drip> => {
        const response = await apiClient.put<ApiResponse<Drip>>(`/drips/${id}`, data);
        return response.data.data!;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/drips/${id}`);
    },

    updateStock: async (id: string, quantityChange: number): Promise<void> => {
        await apiClient.patch(`/drips/${id}/stock`, { quantityChange });
    },
};
