import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { dripOrderRepository } from '../repositories/dripOrder.repository.js';
import { processPayment, calculatePaymentBreakdown, validatePayment, DeliveryData } from '../repositories/paymentRepository.js';
import { supabaseAdmin } from '../lib/supabase.js';

export const dripOrderController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, clinic_id, patient_id } = req.query;
      const orders = await dripOrderRepository.findAll({
        status: status as string | undefined,
        clinic_id: clinic_id as string | undefined,
        patient_id: patient_id as string | undefined,
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get drip orders error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getPending(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.query.clinic_id as string | undefined;
      const orders = await dripOrderRepository.findPendingByClinic(clinicId);

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get pending drip orders error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const clinicId = req.query.clinic_id as string | undefined;
      const stats = await dripOrderRepository.getStats(clinicId);

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Get drip order stats error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const order = await dripOrderRepository.findById(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, error: 'Drip order not found' });
        return;
      }

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Get drip order error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { patient_id, drip_id, quantity, clinic_id, appointment_id, notes } = req.body;

      // Verify drip exists and has stock
      const { data: drip, error: dripError } = await supabaseAdmin
        .from('drips')
        .select('id, stock_quantity, is_active')
        .eq('id', drip_id)
        .maybeSingle();

      if (dripError) throw dripError;
      if (!drip) {
        res.status(404).json({ success: false, error: 'Drip not found' });
        return;
      }
      if (!drip.is_active) {
        res.status(400).json({ success: false, error: 'Drip is not active' });
        return;
      }

      const order = await dripOrderRepository.create({
        patient_id,
        drip_id,
        quantity,
        prescribed_by: req.user!.userId,
        clinic_id,
        appointment_id,
        notes,
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      console.error('Create drip order error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { patient_id, clinic_id, appointment_id, notes, drips } = req.body;

      const orders = [];
      for (const drip of drips) {
        // Verify drip exists
        const { data: dripRecord, error: recordError } = await supabaseAdmin
          .from('drips')
          .select('id, is_active')
          .eq('id', drip.drip_id)
          .maybeSingle();

        if (recordError) throw recordError;

        if (!dripRecord) {
          res.status(404).json({ success: false, error: `Drip ${drip.drip_id} not found` });
          return;
        }
        if (!dripRecord.is_active) {
          res.status(400).json({ success: false, error: `Drip ${drip.drip_id} is not active` });
          return;
        }

        const order = await dripOrderRepository.create({
          patient_id,
          drip_id: drip.drip_id,
          quantity: drip.quantity,
          prescribed_by: req.user!.userId,
          clinic_id,
          appointment_id,
          notes,
        });
        orders.push(order);
      }

      res.status(201).json({ success: true, data: orders });
    } catch (error) {
      console.error('Create batch drip orders error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async deliver(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { delivery_notes, payment } = req.body;

      const order = await dripOrderRepository.findById(id);
      if (!order) {
        res.status(404).json({ success: false, error: 'Drip order not found' });
        return;
      }
      if (order.status !== 'pending') {
        res.status(400).json({ success: false, error: 'Only pending orders can be delivered' });
        return;
      }

      // Get drip info for payment
      const { data: drip, error: dripError } = await supabaseAdmin
        .from('drips')
        .select('id, price, stock_quantity')
        .eq('id', order.drip_id)
        .maybeSingle();

      if (dripError) throw dripError;
      if (!drip) {
        res.status(404).json({ success: false, error: 'Drip not found' });
        return;
      }

      // Check stock
      if (drip.stock_quantity < order.quantity) {
        res.status(400).json({ success: false, error: `Insufficient stock. Available: ${drip.stock_quantity}, Required: ${order.quantity}` });
        return;
      }

      // Process payment
      const dripsForPayment = [{
        drip_id: order.drip_id,
        quantity: order.quantity,
        price: drip.price,
      }];

      const paymentInfo = payment || {
        use_credits: true,
        use_wallet: false,
        wallet_amount: 0,
        cash_amount: 0,
        card_amount: 0,
        pay_later: true,
      };

      // Validate payment
      const breakdown = await calculatePaymentBreakdown(order.patient_id, dripsForPayment);
      if (!paymentInfo.pay_later) {
        const validation = await validatePayment(breakdown, paymentInfo);
        if (!validation.valid) {
          res.status(400).json({ success: false, error: validation.message });
          return;
        }
      }

      // Delivery data for atomic operation
      const delivData: DeliveryData = {
        orderId: order.id,
        dripId: order.drip_id,
        quantity: order.quantity,
        deliveredBy: req.user!.userId,
        deliveryNotes: delivery_notes || null,
      };

      // Single atomic transaction: payment + stock deduction + order status update
      await processPayment(
        order.patient_id,
        order.id,
        dripsForPayment,
        paymentInfo,
        req.user!.userId,
        'drip_order',
        undefined,
        delivData
      );

      // Fetch updated order for response
      const updatedOrder = await dripOrderRepository.findById(id);

      res.json({ success: true, data: updatedOrder });
    } catch (error) {
      console.error('Deliver drip order error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const order = await dripOrderRepository.findById(id);
      if (!order) {
        res.status(404).json({ success: false, error: 'Drip order not found' });
        return;
      }
      if (order.status !== 'pending') {
        res.status(400).json({ success: false, error: 'Only pending orders can be cancelled' });
        return;
      }

      const updatedOrder = await dripOrderRepository.cancel(id);
      res.json({ success: true, data: updatedOrder });
    } catch (error) {
      console.error('Cancel drip order error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getByPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const orders = await dripOrderRepository.findByPatient(patientId);

      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Get patient drip orders error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getPaymentPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const order = await dripOrderRepository.findById(id);
      if (!order) {
        res.status(404).json({ success: false, error: 'Drip order not found' });
        return;
      }

      const { data: drip, error: dripError } = await supabaseAdmin
        .from('drips')
        .select('id, price')
        .eq('id', order.drip_id)
        .maybeSingle();

      if (dripError) throw dripError;
      if (!drip) {
        res.status(404).json({ success: false, error: 'Drip not found' });
        return;
      }

      const breakdown = await calculatePaymentBreakdown(order.patient_id, [{
        drip_id: order.drip_id,
        quantity: order.quantity,
        price: drip.price,
      }]);

      res.json({ success: true, data: breakdown });
    } catch (error) {
      console.error('Get payment preview error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
