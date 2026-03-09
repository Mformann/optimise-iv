import { Router } from 'express';
import { referralController } from '../controllers/referral.controller.js';
import { authenticate, isAdmin, isStaff } from '../middleware/auth.middleware.js';
import { validate, createReferralSourceSchema, createReferralSchemeSchema } from '../middleware/validation.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Referral Sources
router.get('/sources', isStaff, referralController.getAllSources);
router.post('/sources', isAdmin, validate(createReferralSourceSchema), referralController.createSource);
router.put('/sources/:id', isAdmin, referralController.updateSource);
router.delete('/sources/:id', isAdmin, referralController.deleteSource);

// Referral Schemes
router.get('/schemes', isStaff, referralController.getAllSchemes);
router.post('/schemes', isAdmin, validate(createReferralSchemeSchema), referralController.createScheme);
router.put('/schemes/:id', isAdmin, referralController.updateScheme);
router.delete('/schemes/:id', isAdmin, referralController.deleteScheme);

// Referral Rewards
router.get('/rewards', isStaff, referralController.getRewards);
router.post('/rewards/:id/claim', isAdmin, referralController.claimReward);

export default router;
