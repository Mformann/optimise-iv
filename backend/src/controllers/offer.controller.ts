import { Response } from 'express';
import { offerRepository } from '../repositories/offer.repository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const offerController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const offers = await offerRepository.findAll(activeOnly);

      res.json({
        success: true,
        data: offers.map(o => ({
          ...o,
          is_active: o.is_active === 1,
          fixed_value: o.fixed_value === 1,
        })),
      });
    } catch (error) {
      console.error('Get offers error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const offer = await offerRepository.findById(req.params.id);
      if (!offer) {
        res.status(404).json({ success: false, error: 'Offer not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...offer,
          is_active: offer.is_active === 1,
          fixed_value: offer.fixed_value === 1,
        },
      });
    } catch (error) {
      console.error('Get offer error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getByCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const offer = await offerRepository.findByCode(req.params.code);
      if (!offer) {
        res.status(404).json({ success: false, error: 'Offer not found or inactive' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...offer,
          is_active: offer.is_active === 1,
          fixed_value: offer.fixed_value === 1,
        },
      });
    } catch (error) {
      console.error('Get offer by code error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const offer = await offerRepository.create(req.body);

      res.status(201).json({
        success: true,
        data: {
          ...offer,
          is_active: offer.is_active === 1,
          fixed_value: offer.fixed_value === 1,
        },
      });
    } catch (error: any) {
      console.error('Create offer error:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        res.status(400).json({ success: false, error: 'An offer with this code already exists' });
        return;
      }
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const offer = await offerRepository.update(id, req.body);

      if (!offer) {
        res.status(404).json({ success: false, error: 'Offer not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...offer,
          is_active: offer.is_active === 1,
          fixed_value: offer.fixed_value === 1,
        },
      });
    } catch (error: any) {
      console.error('Update offer error:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        res.status(400).json({ success: false, error: 'An offer with this code already exists' });
        return;
      }
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await offerRepository.delete(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Offer not found' });
        return;
      }

      res.json({ success: true, message: 'Offer deleted successfully' });
    } catch (error) {
      console.error('Delete offer error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async redeem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { patient_id, payment_method, custom_cost, appointment_id } = req.body;
      const userId = req.user!.userId;

      const redemption = await offerRepository.redeem(
        id,
        patient_id,
        userId,
        payment_method,
        custom_cost,
        appointment_id
      );

      res.status(201).json({
        success: true,
        data: redemption,
      });
    } catch (error: any) {
      console.error('Redeem offer error:', error);
      const msg = error.message || 'Internal server error';
      res.status(400).json({ success: false, error: msg });
    }
  },
};
