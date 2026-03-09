import { Response } from 'express';
import { inquiryRepository } from '../repositories/inquiry.repository.js';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { getSocketService } from '../services/socket.service.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types/index.js';

export const inquiryController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = {
        partnerId: req.query.partner_id as string,
        clinicId: req.query.clinic_id as string,
        status: req.query.status as 'new' | 'contacted' | 'converted' | 'lost',
      };

      const inquiries = await inquiryRepository.findAll(filters);
      res.json({ success: true, data: inquiries });
    } catch (error) {
      console.error('Get inquiries error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const inquiry = await inquiryRepository.findById(req.params.id);
      if (!inquiry) {
        res.status(404).json({ success: false, error: 'Inquiry not found' });
        return;
      }
      res.json({ success: true, data: inquiry });
    } catch (error) {
      console.error('Get inquiry error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { partner_id, clinic_id, client_name, client_phone, client_email, source, interest_notes } = req.body;

      if (!partner_id || !clinic_id || !client_name || !client_phone) {
        res.status(400).json({ success: false, error: 'partner_id, clinic_id, client_name, and client_phone are required' });
        return;
      }

      const inquiry = await inquiryRepository.create({
        partner_id, clinic_id, client_name, client_phone,
        client_email, source, interest_notes,
      });

      res.status(201).json({ success: true, data: inquiry });
    } catch (error) {
      console.error('Create inquiry error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const inquiry = await inquiryRepository.update(req.params.id, req.body);
      if (!inquiry) {
        res.status(404).json({ success: false, error: 'Inquiry not found' });
        return;
      }
      res.json({ success: true, data: inquiry });
    } catch (error) {
      console.error('Update inquiry error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async markContacted(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const inquiry = await inquiryRepository.markContacted(req.params.id, req.user!.userId);
      if (!inquiry) {
        res.status(404).json({ success: false, error: 'Inquiry not found' });
        return;
      }
      res.json({ success: true, data: inquiry });
    } catch (error) {
      console.error('Mark contacted error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async convert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { doctor_id, therapy_id, scheduled_date, scheduled_time, duration_minutes, type } = req.body;

      const inquiry = await inquiryRepository.findById(id);
      if (!inquiry) {
        res.status(404).json({ success: false, error: 'Inquiry not found' });
        return;
      }

      if (inquiry.status === 'converted') {
        res.status(400).json({ success: false, error: 'Inquiry already converted' });
        return;
      }

      if (!doctor_id || !scheduled_date || !scheduled_time) {
        res.status(400).json({ success: false, error: 'doctor_id, scheduled_date, and scheduled_time are required' });
        return;
      }

      // Create or find patient
      let patientId = inquiry.patient_id;
      if (!patientId) {
        const nameParts = inquiry.client_name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;
        const pid = uuidv4();
        const now = new Date().toISOString();

        const { error: patientError } = await supabaseAdmin.from('patients').insert({
          id: pid,
          first_name: firstName,
          last_name: lastName,
          phone: inquiry.client_phone,
          email: inquiry.client_email || null,
          partner_id: inquiry.partner_id,
          created_at: now,
          updated_at: now
        });

        if (patientError) throw patientError;

        patientId = pid;
      }

      // Create non-clinic appointment
      const appointment = await appointmentRepository.createNonClinic({
        patient_id: patientId,
        doctor_id,
        clinic_id: inquiry.clinic_id,
        therapy_id: therapy_id || null,
        type: type || 'drip',
        scheduled_date,
        scheduled_time,
        duration_minutes,
        created_by: req.user!.userId,
        inquiry_id: id,
      });

      // Update inquiry
      await inquiryRepository.convertToAppointment(id, patientId, appointment.id);

      // Notify doctor
      const notification = await notificationRepository.create({
        user_id: doctor_id,
        appointment_id: appointment.id,
        title: 'New Non-Clinic Appointment',
        message: `${inquiry.client_name} - ${inquiry.clinic_name} - Pre-check pending`,
        type: 'appointment',
      });

      const socketService = getSocketService();
      if (socketService) {
        socketService.sendNotification(doctor_id, notification);
      }

      res.status(201).json({
        success: true,
        data: {
          inquiry: await inquiryRepository.findById(id),
          appointment,
          patient_id: patientId,
        },
      });
    } catch (error) {
      console.error('Convert inquiry error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const partnerId = req.query.partner_id as string;
      const stats = partnerId
        ? await inquiryRepository.getStatsByPartner(partnerId)
        : await inquiryRepository.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Get inquiry stats error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
