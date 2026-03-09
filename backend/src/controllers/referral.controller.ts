import { Response } from 'express';
import { referralRepository } from '../repositories/referral.repository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const referralController = {
  // Referral Sources
  async getAllSources(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const sources = await referralRepository.findAllSources(activeOnly);

      res.json({
        success: true,
        data: sources.map(s => ({
          ...s,
          is_active: s.is_active === 1,
        })),
      });
    } catch (error) {
      console.error('Get referral sources error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const source = await referralRepository.createSource(req.body);

      res.status(201).json({
        success: true,
        data: {
          ...source,
          is_active: source.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Create referral source error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async updateSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const source = await referralRepository.updateSource(id, req.body);

      if (!source) {
        res.status(404).json({ success: false, error: 'Referral source not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...source,
          is_active: source.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Update referral source error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async deleteSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await referralRepository.deleteSource(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Referral source not found' });
        return;
      }

      res.json({ success: true, message: 'Referral source deleted successfully' });
    } catch (error) {
      console.error('Delete referral source error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  // Referral Schemes
  async getAllSchemes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const schemes = await referralRepository.findAllSchemes(activeOnly);

      res.json({
        success: true,
        data: schemes.map(s => ({
          ...s,
          is_active: s.is_active === 1,
        })),
      });
    } catch (error) {
      console.error('Get referral schemes error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createScheme(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const scheme = await referralRepository.createScheme(req.body);

      res.status(201).json({
        success: true,
        data: {
          ...scheme,
          is_active: scheme.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Create referral scheme error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async updateScheme(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scheme = await referralRepository.updateScheme(id, req.body);

      if (!scheme) {
        res.status(404).json({ success: false, error: 'Referral scheme not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...scheme,
          is_active: scheme.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Update referral scheme error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async deleteScheme(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await referralRepository.deleteScheme(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Referral scheme not found' });
        return;
      }

      res.json({ success: true, message: 'Referral scheme deleted successfully' });
    } catch (error) {
      console.error('Delete referral scheme error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  // Referral Rewards
  async getRewards(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.query.patient_id as string | undefined;
      const rewards = await referralRepository.getRewards(patientId);

      res.json({
        success: true,
        data: rewards,
      });
    } catch (error) {
      console.error('Get referral rewards error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async claimReward(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await referralRepository.claimReward(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Reward not found or already claimed' });
        return;
      }

      res.json({
        success: true,
        message: 'Reward claimed successfully',
      });
    } catch (error) {
      console.error('Claim reward error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
