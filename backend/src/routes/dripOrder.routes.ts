import { Router } from 'express';
import { dripOrderController } from '../controllers/dripOrder.controller.js';
import { authenticate, isStaff, isAdminOrDoctor, isAdminOrNurse } from '../middleware/auth.middleware.js';
import { validate, createDripOrderSchema, createBatchDripOrderSchema, deliverDripOrderSchema } from '../middleware/validation.middleware.js';

const router = Router();

router.use(authenticate);

// All staff can view
router.get('/', isStaff, dripOrderController.getAll);
router.get('/pending', isStaff, dripOrderController.getPending);
router.get('/stats', isStaff, dripOrderController.getStats);
router.get('/patient/:patientId', isStaff, dripOrderController.getByPatient);
router.get('/:id', isStaff, dripOrderController.getById);
router.get('/:id/payment-preview', isStaff, dripOrderController.getPaymentPreview);

// Only admin/doctor can prescribe
router.post('/', isAdminOrDoctor, validate(createDripOrderSchema), dripOrderController.create);
router.post('/batch', isAdminOrDoctor, validate(createBatchDripOrderSchema), dripOrderController.createBatch);

// Only admin/nurse can deliver
router.post('/:id/deliver', isAdminOrNurse, validate(deliverDripOrderSchema), dripOrderController.deliver);

// Only admin/doctor can cancel
router.post('/:id/cancel', isAdminOrDoctor, dripOrderController.cancel);

export default router;
