import { Response } from 'express';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { patientRepository } from '../repositories/patient.repository.js';
import { calculatePaymentBreakdown, processPayment, validatePayment, PaymentInfo, CompletionData } from '../repositories/paymentRepository.js';
import { partnerRepository } from '../repositories/partner.repository.js';
import { referralRepository } from '../repositories/referral.repository.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { AuthenticatedRequest } from '../types/index.js';
import { getSocketService } from '../services/socket.service.js';

export const appointmentController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        doctorId: req.query.doctor_id as string,
        clinicId: req.query.clinic_id as string,
        patientId: req.query.patient_id as string,
        date: req.query.date as string,
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
        status: req.query.status as string,
      };

      const { appointments, total } = await appointmentRepository.findAll(filters, limit, offset);

      res.json({
        success: true,
        data: appointments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const appointment = await appointmentRepository.findById(req.params.id);
      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error('Get appointment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start_date, end_date, doctor_id, clinic_id } = req.query;

      if (!start_date || !end_date) {
        res.status(400).json({ success: false, error: 'start_date and end_date are required' });
        return;
      }

      const appointments = await appointmentRepository.findByDateRange(
        start_date as string,
        end_date as string,
        doctor_id as string,
        clinic_id as string
      );

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      console.error('Get calendar error:', error);
      res.status(500).json({ success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
    }
  },

  async getToday(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.query.doctor_id as string || req.user?.userId;
      if (!doctorId) {
        res.status(400).json({ success: false, error: 'Doctor ID required' });
        return;
      }

      const appointments = await appointmentRepository.findTodayByDoctor(doctorId);

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      console.error('Get today appointments error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = {
        ...req.body,
        created_by: req.user!.userId,
      };

      // Check for doctor's calendar overlap
      const hasOverlap = await appointmentRepository.checkOverlap(
        data.doctor_id,
        data.scheduled_date,
        data.scheduled_time,
        data.duration_minutes || 30
      );

      if (hasOverlap) {
        res.status(400).json({
          success: false,
          error: 'Doctor is already booked for this time slot. Please choose another time.'
        });
        return;
      }

      const appointment = await appointmentRepository.create(data);

      // Create notification for doctor
      const patient = await patientRepository.findById(data.patient_id);
      const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';

      const notification = await notificationRepository.create({
        user_id: data.doctor_id,
        appointment_id: appointment.id,
        title: data.is_quick ? 'New Walk-in Appointment' : 'New Scheduled Appointment',
        message: `${patientName} - ${data.type} on ${data.scheduled_date} at ${data.scheduled_time}`,
        type: 'appointment',
      });

      // Send real-time notification
      const socketService = getSocketService();
      if (socketService) {
        socketService.sendNotification(data.doctor_id, {
          ...notification,
          appointment_patient_name: patientName,
          appointment_date: data.scheduled_date,
          appointment_time: data.scheduled_time,
        });
      }

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createQuick(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      const data = {
        ...req.body,
        scheduled_date: today,
        scheduled_time: currentTime,
        is_quick: true,
        created_by: req.user!.userId,
      };

      const appointment = await appointmentRepository.create(data);

      // Create notification for doctor
      const patient = await patientRepository.findById(data.patient_id);
      const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';

      const notification = await notificationRepository.create({
        user_id: data.doctor_id,
        appointment_id: appointment.id,
        title: 'New Walk-in Patient',
        message: `${patientName} is waiting for ${data.type}`,
        type: 'appointment',
      });

      // Send real-time notification
      const socketService = getSocketService();
      if (socketService) {
        socketService.sendNotification(data.doctor_id, {
          ...notification,
          appointment_patient_name: patientName,
          appointment_date: today,
          appointment_time: currentTime,
        });
      }

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error('Create quick appointment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, completion_notes } = req.body;

      const appointment = await appointmentRepository.updateStatus(id, status, completion_notes);
      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      // Auto-dismiss notifications when appointment is completed or cancelled
      if (status === 'completed' || status === 'cancelled') {
        await notificationRepository.dismissForCompletedAppointment(id);
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error('Update appointment status error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async start(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentRepository.startSession(id);

      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error('Start appointment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getPaymentPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { drips } = req.body;

      // Get appointment to find patient
      const appointment = await appointmentRepository.findById(id);
      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      if (!drips || !Array.isArray(drips)) {
        res.status(400).json({ success: false, error: 'Drips array is required' });
        return;
      }

      const homeDeliveryCharges = Number(appointment.home_delivery_charges || 0);
      const breakdown = await calculatePaymentBreakdown(appointment.patient_id, drips, homeDeliveryCharges);

      res.json({
        success: true,
        data: breakdown,
      });
    } catch (error) {
      console.error('Get payment preview error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async complete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { completion_notes, remarks, final_price, drips, payment } = req.body;

      // Get appointment to find patient
      const existingAppointment = await appointmentRepository.findById(id);
      if (!existingAppointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      let paymentResult = null;

      if (drips && drips.length > 0 && payment) {
        // Path A: Drips + payment provided — atomic processPayment with completionData
        const paymentInfo: PaymentInfo = {
          use_credits: payment.use_credits !== false,
          use_wallet: payment.use_wallet || false,
          wallet_amount: payment.wallet_amount,
          cash_amount: payment.cash_amount,
          card_amount: payment.card_amount,
          pay_later: payment.pay_later
        };

        // Calculate breakdown and validate payment
        const homeDeliveryCharges = Number(existingAppointment.home_delivery_charges || 0);
        const breakdown = await calculatePaymentBreakdown(existingAppointment.patient_id, drips, homeDeliveryCharges);
        const validation = await validatePayment(breakdown, paymentInfo);

        if (!validation.valid) {
          res.status(400).json({ success: false, error: validation.message });
          return;
        }

        const paymentStatus = payment.pay_later ? 'pay_later' : 'paid';

        const completionData: CompletionData = {
          completion_notes,
          remarks,
          final_price,
          drips,
          payment_status: paymentStatus,
        };

        // Single atomic transaction: payment + completion + drip deduction
        paymentResult = await processPayment(
          existingAppointment.patient_id,
          id,
          drips,
          paymentInfo,
          req.user!.userId,
          'appointment',
          completionData
        );
      } else {
        // Path B: No payment — use completeSession directly (sets payment_status = 'unpaid')
        await appointmentRepository.completeSession(id, {
          completion_notes,
          remarks,
          final_price,
          drips,
        });
      }

      // Dismiss related notifications
      await notificationRepository.dismissForCompletedAppointment(id);

      // Fetch the final state of the appointment
      const appointment = await appointmentRepository.findById(id);

      // Auto-create partner commission if patient has partner and payment was made
      const effectivePrice = final_price || 0;
      if (effectivePrice > 0) {
        try {
          const patient = await patientRepository.findById(existingAppointment.patient_id);
          if (patient?.partner_id) {
            const partner = await partnerRepository.findById(patient.partner_id);
            if (partner && partner.is_active) {
              const commissionAmount = partner.commission_type === 'percentage'
                ? (effectivePrice * partner.commission_value / 100)
                : partner.commission_value;

              if (commissionAmount > 0) {
                await partnerRepository.createCommission({
                  partner_id: partner.id,
                  patient_id: patient.id,
                  appointment_id: id,
                  amount: commissionAmount,
                });
              }
            }
          }
        } catch (err) {
          console.error('Auto-create commission error (non-fatal):', err);
        }
      }

      // Auto-create referral reward if patient was referred and this is their first completed appointment
      try {
        const patient = await patientRepository.findById(existingAppointment.patient_id);
        if (patient?.referred_by_patient_id) {
          // Check if this is the first completed appointment for this patient
          const { data: countData, error: countError } = await supabaseAdmin
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', patient.id)
            .eq('status', 'completed');

          if (countError) throw countError;
          const completedCount = countData ? 1 : 0; // Wait, count with head: true returns data as null and count as number in response body usually? Actually supabase client returns count as a property.

          // Using head:true correctly
          const { count, error: countErr } = await supabaseAdmin
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', patient.id)
            .eq('status', 'completed');

          if (countErr) throw countErr;

          if (count === 1) {
            // Find an active referral scheme
            const schemes = await referralRepository.findAllSchemes(true);
            if (schemes.length > 0) {
              await referralRepository.createReward({
                referrer_patient_id: patient.referred_by_patient_id,
                referred_patient_id: patient.id,
                scheme_id: schemes[0].id,
              });
            }
          }
        }
      } catch (err) {
        console.error('Auto-create referral reward error (non-fatal):', err);
      }

      res.json({
        success: true,
        data: appointment,
        payment: paymentResult,
      });
    } catch (error) {
      console.error('Complete appointment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ success: false, error: errorMessage });
    }
  },

  async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentRepository.updateStatus(id, 'cancelled');

      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      // Dismiss related notifications
      await notificationRepository.dismissForCompletedAppointment(id);

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error('Cancel appointment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // If date, time, or duration is changing, check for overlaps
      if (req.body.scheduled_date || req.body.scheduled_time || req.body.duration_minutes || req.body.doctor_id) {
        const existing = await appointmentRepository.findById(id);
        if (!existing) {
          res.status(404).json({ success: false, error: 'Appointment not found' });
          return;
        }

        const doctorId = req.body.doctor_id || existing.doctor_id;
        const date = req.body.scheduled_date || existing.scheduled_date;
        const time = req.body.scheduled_time || existing.scheduled_time;
        const duration = req.body.duration_minutes || existing.duration_minutes;

        const hasOverlap = await appointmentRepository.checkOverlap(doctorId, date, time, duration, id);
        if (hasOverlap) {
          res.status(400).json({
            success: false,
            error: 'Doctor is already booked for this time slot. Please choose another time.'
          });
          return;
        }
      }

      const appointment = await appointmentRepository.update(id, req.body);

      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Delete related notifications first
      await notificationRepository.deleteByAppointment(id);

      const success = await appointmentRepository.delete(id);
      if (!success) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      res.json({ success: true, message: 'Appointment deleted successfully' });
    } catch (error) {
      console.error('Delete appointment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createNonClinic(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = {
        ...req.body,
        created_by: req.user!.userId,
      };

      if (!data.patient_id || !data.doctor_id || !data.clinic_id || !data.scheduled_date || !data.scheduled_time) {
        res.status(400).json({ success: false, error: 'patient_id, doctor_id, clinic_id, scheduled_date, and scheduled_time are required' });
        return;
      }

      const appointment = await appointmentRepository.createNonClinic(data);

      const patient = await patientRepository.findById(data.patient_id);
      const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';

      const notification = await notificationRepository.create({
        user_id: data.doctor_id,
        appointment_id: appointment.id,
        title: 'New Non-Clinic Appointment',
        message: `${patientName} - Pre-check pending`,
        type: 'appointment',
      });

      const socketService = getSocketService();
      if (socketService) {
        socketService.sendNotification(data.doctor_id, notification);
      }

      res.status(201).json({ success: true, data: appointment });
    } catch (error) {
      console.error('Create non-clinic appointment error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getNonClinicPipeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const appointments = await appointmentRepository.findNonClinicPipeline();
      res.json({ success: true, data: appointments });
    } catch (error) {
      console.error('Get non-clinic pipeline error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async assignNurse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nurse_id } = req.body;

      if (!nurse_id) {
        res.status(400).json({ success: false, error: 'nurse_id is required' });
        return;
      }

      const appointment = await appointmentRepository.assignNurse(id, nurse_id);
      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      // Notify nurse
      const socketService = getSocketService();
      const notification = await notificationRepository.create({
        user_id: nurse_id,
        appointment_id: id,
        title: 'Nurse Assignment',
        message: `You have been assigned to ${appointment.patient_name} at ${appointment.clinic_name}`,
        type: 'appointment',
      });

      if (socketService) {
        socketService.sendNotification(nurse_id, notification);
      }

      res.json({ success: true, data: appointment });
    } catch (error) {
      console.error('Assign nurse error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async markPreparing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentRepository.updateNonClinicStatus(id, 'preparing');
      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }
      res.json({ success: true, data: appointment });
    } catch (error) {
      console.error('Mark preparing error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async markDispatched(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentRepository.findById(id);
      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      await appointmentRepository.updateNonClinicStatus(id, 'dispatched');

      // If nurse assigned, also move to vitals_check
      if (appointment.nurse_id) {
        await appointmentRepository.updateNonClinicStatus(id, 'vitals_check');

        const socketService = getSocketService();
        const notification = await notificationRepository.create({
          user_id: appointment.nurse_id,
          appointment_id: id,
          title: 'Dispatched - Ready for Vitals',
          message: `${appointment.patient_name} at ${appointment.clinic_name} - Please record vitals`,
          type: 'appointment',
        });

        if (socketService) {
          socketService.sendNotification(appointment.nurse_id, notification);
        }
      }

      const updated = await appointmentRepository.findById(id);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Mark dispatched error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start_date, end_date } = req.query;
      const stats = await appointmentRepository.getStats(start_date as string, end_date as string);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get appointment stats error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
