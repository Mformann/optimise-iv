import { Router } from 'express';
import { vitalsController } from '../controllers/vitals.controller.js';
import { authenticate, isAdminDoctorOrNurse, isStaff } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/appointment/:appointmentId', isStaff, vitalsController.getByAppointment);
router.post('/', isAdminDoctorOrNurse, vitalsController.recordVitals);

export default router;
