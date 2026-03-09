import apiClient from './client';
import { ApiResponse, ReferralSource, ReferralScheme, RewardType } from '../types';

interface ReferralReward {
  id: string;
  referrer_patient_id: string;
  referred_patient_id: string;
  scheme_id: string;
  status: 'pending' | 'claimed' | 'expired';
  created_at: string;
  claimed_at?: string;
  referrer_name?: string;
  referred_name?: string;
  scheme_name?: string;
}

export const referralsApi = {
  // Referral Sources
  getSources: async (activeOnly = false): Promise<ReferralSource[]> => {
    const params = activeOnly ? { active: 'true' } : {};
    const response = await apiClient.get<ApiResponse<ReferralSource[]>>('/referrals/sources', { params });
    return response.data.data || [];
  },

  createSource: async (data: { name: string; description?: string }): Promise<ReferralSource> => {
    const response = await apiClient.post<ApiResponse<ReferralSource>>('/referrals/sources', data);
    return response.data.data!;
  },

  updateSource: async (id: string, data: Partial<{
    name: string;
    description: string;
    is_active: boolean;
  }>): Promise<ReferralSource> => {
    const response = await apiClient.put<ApiResponse<ReferralSource>>(`/referrals/sources/${id}`, data);
    return response.data.data!;
  },

  deleteSource: async (id: string): Promise<void> => {
    await apiClient.delete(`/referrals/sources/${id}`);
  },

  // Referral Schemes
  getSchemes: async (activeOnly = false): Promise<ReferralScheme[]> => {
    const params = activeOnly ? { active: 'true' } : {};
    const response = await apiClient.get<ApiResponse<ReferralScheme[]>>('/referrals/schemes', { params });
    return response.data.data || [];
  },

  createScheme: async (data: {
    name: string;
    description?: string;
    reward_type: RewardType;
    reward_value: number;
    min_referrals: number;
  }): Promise<ReferralScheme> => {
    const response = await apiClient.post<ApiResponse<ReferralScheme>>('/referrals/schemes', data);
    return response.data.data!;
  },

  updateScheme: async (id: string, data: Partial<{
    name: string;
    description: string;
    reward_type: RewardType;
    reward_value: number;
    min_referrals: number;
    is_active: boolean;
  }>): Promise<ReferralScheme> => {
    const response = await apiClient.put<ApiResponse<ReferralScheme>>(`/referrals/schemes/${id}`, data);
    return response.data.data!;
  },

  deleteScheme: async (id: string): Promise<void> => {
    await apiClient.delete(`/referrals/schemes/${id}`);
  },

  // Referral Rewards
  getRewards: async (patientId?: string): Promise<ReferralReward[]> => {
    const params = patientId ? { patient_id: patientId } : {};
    const response = await apiClient.get<ApiResponse<ReferralReward[]>>('/referrals/rewards', { params });
    return response.data.data || [];
  },

  claimReward: async (rewardId: string): Promise<void> => {
    await apiClient.post(`/referrals/rewards/${rewardId}/claim`);
  },
};
