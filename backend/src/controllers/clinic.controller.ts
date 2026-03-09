import { Response } from 'express';
import { clinicRepository } from '../repositories/clinic.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const clinicController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const clinics = await clinicRepository.findAll(activeOnly);

      res.json({
        success: true,
        data: clinics.map(c => ({
          ...c,
          is_active: c.is_active === 1,
        })),
      });
    } catch (error) {
      console.error('Get clinics error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clinic = await clinicRepository.findById(req.params.id);
      if (!clinic) {
        res.status(404).json({ success: false, error: 'Clinic not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...clinic,
          is_active: clinic.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Get clinic error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, address, city, phone, email, location_type } = req.body;
      const clinic = await clinicRepository.create({ name, address, city, phone, email, location_type: location_type || 'clinic' });

      res.status(201).json({
        success: true,
        data: {
          ...clinic,
          is_active: clinic.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Create clinic error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, address, city, phone, email, location_type, is_active } = req.body;
      const clinic = await clinicRepository.update(id, { name, address, city, phone, email, location_type, is_active });

      if (!clinic) {
        res.status(404).json({ success: false, error: 'Clinic not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...clinic,
          is_active: clinic.is_active === 1,
        },
      });
    } catch (error) {
      console.error('Update clinic error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await clinicRepository.delete(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Clinic not found' });
        return;
      }

      res.json({ success: true, message: 'Clinic deleted successfully' });
    } catch (error) {
      console.error('Delete clinic error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getDoctors(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const doctors = await userRepository.findDoctorsByClinic(id);

      res.json({
        success: true,
        data: doctors.map(d => ({
          id: d.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
        })),
      });
    } catch (error) {
      console.error('Get clinic doctors error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async assignDoctor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: clinicId } = req.params;
      const { doctor_id, is_primary } = req.body;

      // Verify doctor exists and is a doctor
      const doctor = await userRepository.findById(doctor_id);
      if (!doctor || doctor.role !== 'doctor') {
        res.status(400).json({ success: false, error: 'Invalid doctor' });
        return;
      }

      // Verify clinic exists
      const clinic = await clinicRepository.findById(clinicId);
      if (!clinic) {
        res.status(404).json({ success: false, error: 'Clinic not found' });
        return;
      }

      const assignment = await clinicRepository.assignDoctor(clinicId, doctor_id, is_primary);

      res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      console.error('Assign doctor error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async removeDoctor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: clinicId, doctorId } = req.params;
      const success = await clinicRepository.removeDoctor(clinicId, doctorId);

      if (!success) {
        res.status(404).json({ success: false, error: 'Assignment not found' });
        return;
      }

      res.json({ success: true, message: 'Doctor removed from clinic' });
    } catch (error) {
      console.error('Remove doctor error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
