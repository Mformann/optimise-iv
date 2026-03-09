import apiClient from './client';
import { ApiResponse, PatientWallet } from '../types';

export const walletApi = {
    getWallet: async (patientId: string): Promise<ApiResponse<PatientWallet>> => {
        const response = await apiClient.get(`/patients/${patientId}/wallet`);
        return response.data;
    },

    addMoney: async (
        patientId: string,
        data: { amount: number; method: string; description?: string }
    ): Promise<ApiResponse<void>> => {
        const response = await apiClient.post(`/patients/${patientId}/wallet/add-money`, data);
        return response.data;
    },

    purchaseDrip: async (
        patientId: string,
        data: {
            dripId: string;
            quantity: number;
            totalCost: number;
            method: string; // 'wallet' | 'cash' | 'card' | 'transfer'
            expiresAt?: string;
        }
    ): Promise<ApiResponse<void>> => {
        const response = await apiClient.post(`/patients/${patientId}/wallet/purchase-drip`, data);
        return response.data;
    },
};
