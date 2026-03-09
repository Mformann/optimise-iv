import { Response } from 'express';
import { partnerRepository } from '../repositories/partner.repository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const partnerController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const partners = await partnerRepository.findAll(activeOnly);

      const data = await Promise.all(partners.map(async (p) => ({
        ...p,
        is_active: p.is_active === 1,
        commission_stats: await partnerRepository.getCommissionStats(p.id),
      })));

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Get partners error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const partner = await partnerRepository.findById(req.params.id);
      if (!partner) {
        res.status(404).json({ success: false, error: 'Partner not found' });
        return;
      }

      const stats = await partnerRepository.getCommissionStats(partner.id);

      res.json({
        success: true,
        data: {
          ...partner,
          is_active: partner.is_active === 1,
          commission_stats: stats,
        },
      });
    } catch (error) {
      console.error('Get partner error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const partner = await partnerRepository.create(req.body);

      res.status(201).json({
        success: true,
        data: {
          ...partner,
          is_active: partner.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Create partner error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const partner = await partnerRepository.update(id, req.body);

      if (!partner) {
        res.status(404).json({ success: false, error: 'Partner not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...partner,
          is_active: partner.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Update partner error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await partnerRepository.delete(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Partner not found' });
        return;
      }

      res.json({ success: true, message: 'Partner deleted successfully' });
    } catch (error) {
      console.error('Delete partner error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getCommissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const commissions = await partnerRepository.getCommissions(id);

      res.json({
        success: true,
        data: commissions,
      });
    } catch (error) {
      console.error('Get partner commissions error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async markCommissionPaid(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, commissionId } = req.params;
      const success = await partnerRepository.markCommissionPaid(commissionId);

      if (!success) {
        res.status(404).json({ success: false, error: 'Commission not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Commission marked as paid',
      });
    } catch (error) {
      console.error('Mark commission paid error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getHostReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      const partner = await partnerRepository.findById(id);
      if (!partner) {
        res.status(404).json({ success: false, error: 'Partner not found' });
        return;
      }

      const report = await partnerRepository.getHostReport(id, startDate, endDate);

      res.json({
        success: true,
        data: {
          partner: { ...partner, is_active: partner.is_active === 1 },
          ...report,
        },
      });
    } catch (error) {
      console.error('Get host report error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
