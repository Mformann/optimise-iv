import { Response } from 'express';
import { precheckRepository } from '../repositories/precheck.repository.js';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { getSocketService } from '../services/socket.service.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { AuthenticatedRequest } from '../types/index.js';

export const precheckController = {
  async getByAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const form = await precheckRepository.findByAppointmentId(req.params.appointmentId);
      if (!form) {
        res.status(404).json({ success: false, error: 'Pre-check form not found' });
        return;
      }
      res.json({ success: true, data: form });
    } catch (error) {
      console.error('Get pre-check error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { appointment_id, patient_id } = req.body;

      if (!appointment_id || !patient_id) {
        res.status(400).json({ success: false, error: 'appointment_id and patient_id are required' });
        return;
      }

      // Check if form already exists
      const existing = await precheckRepository.findByAppointmentId(appointment_id);
      if (existing) {
        // Update existing form instead
        const updated = await precheckRepository.update(existing.id, req.body);
        res.json({ success: true, data: updated });
        return;
      }

      const form = await precheckRepository.create(req.body);
      res.status(201).json({ success: true, data: form });
    } catch (error) {
      console.error('Create pre-check error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async submit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // If body has form data, update first
      const existing = await precheckRepository.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Pre-check form not found' });
        return;
      }

      // Update form fields if provided
      if (Object.keys(req.body).length > 0) {
        await precheckRepository.update(id, req.body);
      }

      // Mark as submitted
      const form = await precheckRepository.submit(id);

      // Move appointment to pending_review
      await appointmentRepository.updateNonClinicStatus(existing.appointment_id, 'pending_review');

      // Notify doctors
      const appointment = await appointmentRepository.findById(existing.appointment_id);
      const { data: doctorsData, error: doctorsError } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('role', ['doctor', 'admin'])
        .eq('is_active', true);

      if (doctorsError) throw doctorsError;
      const doctors = (doctorsData ?? []) as { id: string }[];

      const socketService = getSocketService();
      for (const doctor of doctors) {
        const notification = await notificationRepository.create({
          user_id: doctor.id,
          appointment_id: existing.appointment_id,
          title: 'Pre-Check Submitted - Review Required',
          message: `${appointment?.patient_name || 'Patient'} at ${appointment?.clinic_name || 'venue'} needs review`,
          type: 'appointment',
        });

        if (socketService) {
          socketService.sendNotification(doctor.id, notification);
        }
      }

      res.json({ success: true, data: form });
    } catch (error) {
      console.error('Submit pre-check error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
