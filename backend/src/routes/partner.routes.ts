import { Router } from 'express';
import { partnerController } from '../controllers/partner.controller.js';
import { authenticate, isAdmin, isStaff } from '../middleware/auth.middleware.js';
import { validate, createPartnerSchema } from '../middleware/validation.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Staff can view partners (for patient registration)
/**
 * @swagger
 * /api/partners:
 *   get:
 *     summary: Get all partners
 *     tags: [Partners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of partners
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', isStaff, partnerController.getAll);

/**
 * @swagger
 * /api/partners/{id}:
 *   get:
 *     summary: Get partner by ID
 *     tags: [Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Partner ID
 *     responses:
 *       200:
 *         description: Partner details
 *       404:
 *         description: Partner not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', isStaff, partnerController.getById);

// Admin-only routes
/**
 * @swagger
 * /api/partners:
 *   post:
 *     summary: Create a new partner
 *     tags: [Partners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePartner'
 *     responses:
 *       201:
 *         description: Partner created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', isAdmin, validate(createPartnerSchema), partnerController.create);
router.put('/:id', isAdmin, partnerController.update);
router.delete('/:id', isAdmin, partnerController.delete);
router.get('/:id/commissions', isAdmin, partnerController.getCommissions);
router.put('/:id/commissions/:commissionId/paid', isAdmin, partnerController.markCommissionPaid);
router.get('/:id/host-report', isAdmin, partnerController.getHostReport);

export default router;
