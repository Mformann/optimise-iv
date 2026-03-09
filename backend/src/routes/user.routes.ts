import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate, isAdmin, isStaff } from '../middleware/auth.middleware.js';
import { validate, createUserSchema, updateUserSchema } from '../middleware/validation.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all doctors (accessible by all staff for appointment booking)
router.get('/doctors', isStaff, userController.getDoctors);

// Get all nurses (accessible by all staff)
router.get('/nurses', isStaff, userController.getNurses);

// Admin-only routes
router.get('/', isAdmin, userController.getAll);
router.get('/:id', isAdmin, userController.getById);
router.get('/:id/clinics', isAdmin, userController.getClinics);
router.post('/', isAdmin, validate(createUserSchema), userController.create);
router.put('/:id', isAdmin, validate(updateUserSchema), userController.update);
router.delete('/:id', isAdmin, userController.delete);

export default router;
