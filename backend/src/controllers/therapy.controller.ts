import { Response } from 'express';
import { therapyRepository } from '../repositories/therapy.repository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const therapyController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const therapies = await therapyRepository.findAll(activeOnly);

      res.json({
        success: true,
        data: therapies.map(t => ({
          ...t,
          is_active: t.is_active === 1,
        })),
      });
    } catch (error) {
      console.error('Get therapies error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const therapy = await therapyRepository.findById(req.params.id);
      if (!therapy) {
        res.status(404).json({ success: false, error: 'Therapy not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...therapy,
          is_active: therapy.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Get therapy error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const therapy = await therapyRepository.create(req.body);

      res.status(201).json({
        success: true,
        data: {
          ...therapy,
          is_active: therapy.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Create therapy error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const therapy = await therapyRepository.update(id, req.body);

      if (!therapy) {
        res.status(404).json({ success: false, error: 'Therapy not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...therapy,
          is_active: therapy.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Update therapy error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await therapyRepository.delete(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Therapy not found' });
        return;
      }

      res.json({ success: true, message: 'Therapy deleted successfully' });
    } catch (error) {
      console.error('Delete therapy error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
