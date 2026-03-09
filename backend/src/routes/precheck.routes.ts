import { Router } from 'express';
import { precheckController } from '../controllers/precheck.controller.js';
import { authenticate, isStaff } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/appointment/:appointmentId', isStaff, precheckController.getByAppointment);
router.post('/', isStaff, precheckController.create);
router.post('/:id/submit', isStaff, precheckController.submit);

export default router;
