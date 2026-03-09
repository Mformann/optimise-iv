import { Response } from 'express';
import { vitalsRepository } from '../repositories/vitals.repository.js';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { getSocketService } from '../services/socket.service.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { AuthenticatedRequest } from '../types/index.js';

export const vitalsController = {
  async getByAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vitals = await vitalsRepository.findByAppointmentId(req.params.appointmentId);
      if (!vitals) {
        res.status(404).json({ success: false, error: 'Vitals not found' });
        return;
      }
      res.json({ success: true, data: vitals });
    } catch (error) {
      console.error('Get vitals error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async recordVitals(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        appointment_id, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, temperature, oxygen_saturation, blood_sugar, weight,
        decision, abnormal_notes,
      } = req.body;

      if (!appointment_id || !decision) {
        res.status(400).json({ success: false, error: 'appointment_id and decision are required' });
        return;
      }

      const appointment = await appointmentRepository.findById(appointment_id);
      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      const vitals = await vitalsRepository.create({
        appointment_id,
        nurse_id: req.user!.userId,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate,
        temperature,
        oxygen_saturation,
        blood_sugar,
        weight,
        decision,
        abnormal_notes,
      });

      // Update appointment status based on vitals decision
      if (decision === 'normal') {
        await appointmentRepository.updateNonClinicStatus(appointment_id, 'vitals_cleared');
        // Auto-transition to in_progress
        await appointmentRepository.startSession(appointment_id);
      } else {
        await appointmentRepository.updateNonClinicStatus(appointment_id, 'vitals_failed');
      }

      // Notify doctor + admin
      const socketService = getSocketService();
      const { data: notifyUsers, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('role', ['doctor', 'admin'])
        .eq('is_active', true);

      if (usersError) throw usersError;

      const users = (notifyUsers ?? []) as { id: string }[];

      const statusMsg = decision === 'normal' ? 'Normal - Proceeding' : 'Abnormal - Appointment Cancelled';

      for (const user of users) {
        const notification = await notificationRepository.create({
          user_id: user.id,
          appointment_id,
          title: `Vitals: ${statusMsg}`,
          message: `${appointment.patient_name} at ${appointment.clinic_name}`,
          type: 'appointment',
        });

        if (socketService) {
          socketService.sendNotification(user.id, notification);
        }
      }

      res.status(201).json({ success: true, data: vitals });
    } catch (error) {
      console.error('Record vitals error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
