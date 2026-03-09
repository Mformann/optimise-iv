import { Router } from 'express';
import { clinicController } from '../controllers/clinic.controller.js';
import { authenticate, isAdmin, isStaff } from '../middleware/auth.middleware.js';
import { validate, createClinicSchema, updateClinicSchema } from '../middleware/validation.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Staff can view clinics (for appointment booking)
router.get('/', isStaff, clinicController.getAll);
router.get('/:id', isStaff, clinicController.getById);
router.get('/:id/doctors', isStaff, clinicController.getDoctors);

// Admin-only routes
router.post('/', isAdmin, validate(createClinicSchema), clinicController.create);
router.put('/:id', isAdmin, validate(updateClinicSchema), clinicController.update);
router.delete('/:id', isAdmin, clinicController.delete);
router.post('/:id/doctors', isAdmin, clinicController.assignDoctor);
router.delete('/:id/doctors/:doctorId', isAdmin, clinicController.removeDoctor);

export default router;
