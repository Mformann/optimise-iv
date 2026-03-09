import apiClient from './client';
import { ApiResponse, Notification } from '../types';

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unread_count: number;
}

export const notificationsApi = {
  getAll: async (unreadOnly = false): Promise<{ notifications: Notification[]; unreadCount: number }> => {
    const params = unreadOnly ? { unread: 'true' } : {};
    const response = await apiClient.get<NotificationsResponse>('/notifications', { params });
    return {
      notifications: response.data.data || [],
      unreadCount: response.data.unread_count || 0,
    };
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data.data?.count || 0;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};
