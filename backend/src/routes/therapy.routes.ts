import { Router } from 'express';
import { therapyController } from '../controllers/therapy.controller.js';
import { authenticate, isAdmin, isStaff } from '../middleware/auth.middleware.js';
import { validate, createTherapySchema } from '../middleware/validation.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Staff can view therapies
router.get('/', isStaff, therapyController.getAll);
router.get('/:id', isStaff, therapyController.getById);

// Admin-only routes
router.post('/', isAdmin, validate(createTherapySchema), therapyController.create);
router.put('/:id', isAdmin, therapyController.update);
router.delete('/:id', isAdmin, therapyController.delete);

export default router;
