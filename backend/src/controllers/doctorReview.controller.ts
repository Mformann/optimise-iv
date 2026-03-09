import { Response } from 'express';
import { doctorReviewRepository } from '../repositories/doctorReview.repository.js';
import { precheckRepository } from '../repositories/precheck.repository.js';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { getSocketService } from '../services/socket.service.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { AuthenticatedRequest } from '../types/index.js';

export const doctorReviewController = {
  async getPendingReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.query.doctor_id as string;
      const reviews = await doctorReviewRepository.findPendingReviews(doctorId);
      const pendingAppointments = await doctorReviewRepository.findAllPendingAppointments();

      res.json({
        success: true,
        data: {
          reviews,
          pending_appointments: pendingAppointments,
        },
      });
    } catch (error) {
      console.error('Get pending reviews error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getByAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const review = await doctorReviewRepository.findByAppointmentId(req.params.appointmentId);
      if (!review) {
        res.status(404).json({ success: false, error: 'Doctor review not found' });
        return;
      }
      res.json({ success: true, data: review });
    } catch (error) {
      console.error('Get doctor review error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { appointment_id, decision, risk_factors, notes } = req.body;

      if (!appointment_id || !decision) {
        res.status(400).json({ success: false, error: 'appointment_id and decision are required' });
        return;
      }

      // Find pre-check form
      const preCheckForm = await precheckRepository.findByAppointmentId(appointment_id);
      if (!preCheckForm) {
        res.status(400).json({ success: false, error: 'Pre-check form not found for this appointment' });
        return;
      }

      // Mark pre-check as reviewed
      await precheckRepository.markReviewed(preCheckForm.id);

      const requiresCall = decision === 'risky' ? 1 : 0;

      const review = await doctorReviewRepository.create({
        pre_check_form_id: preCheckForm.id,
        appointment_id,
        doctor_id: req.user!.userId,
        decision,
        risk_factors,
        requires_call: requiresCall,
        notes,
      });

      // Update appointment status based on decision
      if (decision === 'safe') {
        await appointmentRepository.updateNonClinicStatus(appointment_id, 'confirmed');
      } else if (decision === 'risky') {
        await appointmentRepository.updateNonClinicStatus(appointment_id, 'review_risky');
      } else if (decision === 'rejected') {
        await appointmentRepository.updateNonClinicStatus(appointment_id, 'cancelled');
      }

      // Notify reception/admin
      const socketService = getSocketService();
      const { data: staffData, error: staffError } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('role', ['reception', 'admin'])
        .eq('is_active', true);

      if (staffError) throw staffError;
      const staffUsers = (staffData ?? []) as { id: string }[];

      const appointment = await appointmentRepository.findById(appointment_id);
      const statusMsg = decision === 'safe' ? 'Cleared' : decision === 'risky' ? 'Risky - Call Required' : 'Rejected';

      for (const staff of staffUsers) {
        const notification = await notificationRepository.create({
          user_id: staff.id,
          appointment_id,
          title: `Doctor Review: ${statusMsg}`,
          message: `${appointment?.patient_name || 'Patient'} - ${appointment?.clinic_name || 'venue'}`,
          type: 'appointment',
        });

        if (socketService) {
          socketService.sendNotification(staff.id, notification);
        }
      }

      res.status(201).json({ success: true, data: review });
    } catch (error) {
      console.error('Create doctor review error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async completeDoctorCall(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { call_notes, final_decision } = req.body;

      if (!call_notes || !final_decision) {
        res.status(400).json({ success: false, error: 'call_notes and final_decision are required' });
        return;
      }

      const review = await doctorReviewRepository.completeDoctorCall(id, call_notes, final_decision);
      if (!review) {
        res.status(404).json({ success: false, error: 'Doctor review not found' });
        return;
      }

      // Update appointment status
      if (final_decision === 'cleared') {
        await appointmentRepository.updateNonClinicStatus(review.appointment_id, 'confirmed');
      } else if (final_decision === 'rejected') {
        await appointmentRepository.updateNonClinicStatus(review.appointment_id, 'cancelled');
      }

      // Notify reception/admin
      const socketService = getSocketService();
      const { data: staffData2, error: staffError2 } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('role', ['reception', 'admin'])
        .eq('is_active', true);

      if (staffError2) throw staffError2;
      const staffUsers2 = (staffData2 ?? []) as { id: string }[];

      const appointment = await appointmentRepository.findById(review.appointment_id);
      const statusMsg = final_decision === 'cleared' ? 'Cleared after call' : 'Rejected after call';

      for (const staff of staffUsers2) {
        const notification = await notificationRepository.create({
          user_id: staff.id,
          appointment_id: review.appointment_id,
          title: `Doctor Call Complete: ${statusMsg}`,
          message: `${appointment?.patient_name || 'Patient'} - ${appointment?.clinic_name || 'venue'}`,
          type: 'appointment',
        });

        if (socketService) {
          socketService.sendNotification(staff.id, notification);
        }
      }

      res.json({ success: true, data: review });
    } catch (error) {
      console.error('Complete doctor call error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
