import { Router } from 'express';
import { inquiryController } from '../controllers/inquiry.controller.js';
import { authenticate, isStaff, isAdminOrReception } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', isStaff, inquiryController.getAll);
router.get('/stats', isStaff, inquiryController.getStats);
router.get('/:id', isStaff, inquiryController.getById);
router.post('/', isAdminOrReception, inquiryController.create);
router.put('/:id', isAdminOrReception, inquiryController.update);
router.post('/:id/contact', isStaff, inquiryController.markContacted);
router.post('/:id/convert', isAdminOrReception, inquiryController.convert);

export default router;
