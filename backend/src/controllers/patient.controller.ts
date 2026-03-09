import { Response } from 'express';
import { patientRepository } from '../repositories/patient.repository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const patientController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { patients, total } = await patientRepository.findAll(limit, offset);

      res.json({
        success: true,
        data: patients,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patient = await patientRepository.findById(req.params.id);
      if (!patient) {
        res.status(404).json({ success: false, error: 'Patient not found' });
        return;
      }

      // Get referral count
      const referralCount = await patientRepository.countReferrals(patient.id);

      res.json({
        success: true,
        data: {
          ...patient,
          referral_count: referralCount,
        },
      });
    } catch (error) {
      console.error('Get patient error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
        return;
      }

      const patients = await patientRepository.search(query);

      res.json({
        success: true,
        data: patients.map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          phone: p.phone,
          email: p.email,
        })),
      });
    } catch (error) {
      console.error('Search patients error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patient = await patientRepository.create(req.body);

      res.status(201).json({
        success: true,
        data: patient,
      });
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const patient = await patientRepository.update(id, req.body);

      if (!patient) {
        res.status(404).json({ success: false, error: 'Patient not found' });
        return;
      }

      res.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await patientRepository.delete(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Patient not found' });
        return;
      }

      res.json({ success: true, message: 'Patient deleted successfully' });
    } catch (error) {
      console.error('Delete patient error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getReferrals(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const referrals = await patientRepository.findReferrals(id);

      res.json({
        success: true,
        data: referrals,
      });
    } catch (error) {
      console.error('Get patient referrals error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
