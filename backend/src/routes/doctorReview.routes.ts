import { Router } from 'express';
import { doctorReviewController } from '../controllers/doctorReview.controller.js';
import { authenticate, isAdminOrDoctor, isStaff } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/pending', isAdminOrDoctor, doctorReviewController.getPendingReviews);
router.get('/appointment/:appointmentId', isStaff, doctorReviewController.getByAppointment);
router.post('/', isAdminOrDoctor, doctorReviewController.createReview);
router.post('/:id/complete-call', isAdminOrDoctor, doctorReviewController.completeDoctorCall);

export default router;
