import { Response } from 'express';
import walletRepository from '../repositories/walletRepository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const walletController = {
    async getWalletDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const balance = await walletRepository.getWalletBalance(id);
            const dripBalances = await walletRepository.getDripBalances(id);
            const transactions = await walletRepository.getTransactions(id);

            res.json({
                success: true,
                data: {
                    balance,
                    drip_balances: dripBalances,
                    transactions,
                },
            });
        } catch (error) {
            console.error('Get wallet details error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async addMoney(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { amount, method, description } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            if (!amount || amount <= 0) {
                res.status(400).json({ success: false, error: 'Invalid amount' });
                return;
            }

            if (!['cash', 'card', 'transfer'].includes(method)) {
                res.status(400).json({ success: false, error: 'Invalid payment method' });
                return;
            }

            await walletRepository.addMoney(id, amount, method, userId, description);

            res.json({
                success: true,
                message: 'Money added successfully',
            });
        } catch (error) {
            console.error('Add money error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async purchaseDrip(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { dripId, quantity, totalCost, method, expiresAt } = req.body; // method: 'wallet' or 'cash'/'card'/'transfer'
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            if (!dripId || !quantity || quantity <= 0 || totalCost < 0) {
                res.status(400).json({ success: false, error: 'Invalid purchase details' });
                return;
            }

            if (method === 'wallet') {
                await walletRepository.buyDripWithWallet(id, dripId, quantity, totalCost, userId, expiresAt);
            } else {
                await walletRepository.buyDripDirect(id, dripId, quantity, totalCost, method, userId, expiresAt);
            }

            res.json({
                success: true,
                message: 'Drips purchased successfully',
            });
        } catch (error: any) {
            console.error('Purchase drip error:', error);
            if (error.message === 'Insufficient wallet balance') {
                res.status(400).json({ success: false, error: error.message });
            } else {
                res.status(500).json({ success: false, error: 'Internal server error' });
            }
        }
    },
};
