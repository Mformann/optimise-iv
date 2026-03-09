import { Router } from 'express';
import { offerController } from '../controllers/offer.controller.js';
import { authenticate, isAdmin, isStaff } from '../middleware/auth.middleware.js';
import { validate, createOfferSchema, redeemOfferSchema } from '../middleware/validation.middleware.js';

const router = Router();

router.use(authenticate);

// Staff can view active offers and lookup by code (needed for billing flow)
router.get('/', isStaff, offerController.getAll);
router.get('/code/:code', isStaff, offerController.getByCode);
router.get('/:id', isStaff, offerController.getById);

// Staff can redeem offers (during billing)
router.post('/:id/redeem', isStaff, validate(redeemOfferSchema), offerController.redeem);

// Admin-only CRUD
router.post('/', isAdmin, validate(createOfferSchema), offerController.create);
router.put('/:id', isAdmin, offerController.update);
router.delete('/:id', isAdmin, offerController.delete);

export default router;
