import { Response } from 'express';
import { userRepository } from '../repositories/user.repository.js';
import { clinicRepository } from '../repositories/clinic.repository.js';
import { AuthenticatedRequest, UserRole } from '../types/index.js';

export const userController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const role = req.query.role as UserRole | undefined;
      const users = await userRepository.findAll(role);

      res.json({
        success: true,
        data: users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          phone: u.phone,
          is_active: u.is_active === 1,
          created_at: u.created_at,
          updated_at: u.updated_at,
        })),
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          is_active: user.is_active === 1,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getDoctors(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.query.clinic_id as string | undefined;

      const doctors = clinicId
        ? await userRepository.findDoctorsByClinic(clinicId)
        : await userRepository.findDoctors();

      res.json({
        success: true,
        data: doctors.map(d => ({
          id: d.id,
          email: d.email,
          name: d.name,
          phone: d.phone,
        })),
      });
    } catch (error) {
      console.error('Get doctors error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getNurses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const nurses = await userRepository.findNurses();

      res.json({
        success: true,
        data: nurses.map(n => ({
          id: n.id,
          email: n.email,
          name: n.name,
          phone: n.phone,
        })),
      });
    } catch (error) {
      console.error('Get nurses error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, name, role, phone } = req.body;

      // Check if email already exists
      const existing = await userRepository.findByEmail(email);
      if (existing) {
        res.status(400).json({ success: false, error: 'Email already in use' });
        return;
      }

      const user = await userRepository.create({ email, password, name, role, phone });

      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          is_active: user.is_active === 1,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      // If updating email, check for duplicates
      if (updates.email) {
        const existing = await userRepository.findByEmail(updates.email);
        if (existing && existing.id !== id) {
          res.status(400).json({ success: false, error: 'Email already in use' });
          return;
        }
      }

      const user = await userRepository.update(id, updates);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          is_active: user.is_active === 1,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (req.user?.userId === id) {
        res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        return;
      }

      const success = await userRepository.delete(id);
      if (!success) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getClinics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const clinics = await clinicRepository.findByDoctor(id);

      res.json({
        success: true,
        data: clinics.map(c => ({
          id: c.id,
          name: c.name,
          address: c.address,
          city: c.city,
        })),
      });
    } catch (error) {
      console.error('Get user clinics error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
