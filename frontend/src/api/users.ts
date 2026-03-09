import apiClient from './client';
import { ApiResponse, User, UserRole } from '../types';

export const usersApi = {
  getUsers: async (role?: UserRole): Promise<User[]> => {
    const params = role ? { role } : {};
    const response = await apiClient.get<ApiResponse<User[]>>('/users', { params });
    return response.data.data || [];
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data!;
  },

  getDoctors: async (clinicId?: string): Promise<User[]> => {
    const params = clinicId ? { clinic_id: clinicId } : {};
    const response = await apiClient.get<ApiResponse<User[]>>('/users/doctors', { params });
    return response.data.data || [];
  },

  create: async (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone?: string;
  }): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    return response.data.data!;
  },

  update: async (id: string, data: Partial<{
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone: string;
    is_active: boolean;
  }>): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};

