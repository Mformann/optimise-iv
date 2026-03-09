import { Response } from 'express';
import { dripRepository } from '../repositories/drip.repository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const dripController = {
    async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const activeOnly = req.query.active === 'true';
            const drips = await dripRepository.findAll(!activeOnly);

            res.json({
                success: true,
                data: drips.map(d => ({
                    ...d,
                    is_active: d.is_active === 1,
                })),
            });
        } catch (error) {
            console.error('Get drips error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const drip = await dripRepository.findById(req.params.id);
            if (!drip) {
                res.status(404).json({ success: false, error: 'Drip not found' });
                return;
            }

            res.json({
                success: true,
                data: {
                    ...drip,
                    is_active: drip.is_active === 1,
                },
            });
        } catch (error) {
            console.error('Get drip error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const drip = await dripRepository.create(req.body);

            res.status(201).json({
                success: true,
                data: {
                    ...drip,
                    is_active: drip.is_active === 1,
                },
            });
        } catch (error) {
            console.error('Create drip error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const drip = await dripRepository.update(id, req.body);

            if (!drip) {
                res.status(404).json({ success: false, error: 'Drip not found' });
                return;
            }

            res.json({
                success: true,
                data: {
                    ...drip,
                    is_active: drip.is_active === 1,
                },
            });
        } catch (error) {
            console.error('Update drip error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const success = await dripRepository.delete(id);

            if (!success) {
                res.status(404).json({ success: false, error: 'Drip not found' });
                return;
            }

            res.json({ success: true, message: 'Drip deleted successfully' });
        } catch (error) {
            console.error('Delete drip error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async updateStock(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { quantityChange } = req.body;
            const success = await dripRepository.updateStock(id, quantityChange);

            if (!success) {
                res.status(404).json({ success: false, error: 'Drip not found' });
                return;
            }

            res.json({ success: true, message: 'Stock updated successfully' });
        } catch (error) {
            console.error('Update stock error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },
};
