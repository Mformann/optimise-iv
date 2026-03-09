import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import clinicRoutes from './clinic.routes.js';
import patientRoutes from './patient.routes.js';
import appointmentRoutes from './appointment.routes.js';
import notificationRoutes from './notification.routes.js';
import therapyRoutes from './therapy.routes.js';
import partnerRoutes from './partner.routes.js';
import referralRoutes from './referral.routes.js';
import dripRoutes from './drip.routes.js';
import dripOrderRoutes from './dripOrder.routes.js';
import inquiryRoutes from './inquiry.routes.js';
import precheckRoutes from './precheck.routes.js';
import doctorReviewRoutes from './doctorReview.routes.js';
import vitalsRoutes from './vitals.routes.js';
import offerRoutes from './offer.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clinics', clinicRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/therapies', therapyRoutes);
router.use('/partners', partnerRoutes);
router.use('/referrals', referralRoutes);
router.use('/drips', dripRoutes);
router.use('/drip-orders', dripOrderRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/pre-checks', precheckRoutes);
router.use('/doctor-reviews', doctorReviewRoutes);
router.use('/vitals', vitalsRoutes);
router.use('/offers', offerRoutes);

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
