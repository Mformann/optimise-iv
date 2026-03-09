import { Router } from 'express';
import { patientController } from '../controllers/patient.controller.js';
import { walletController } from '../controllers/wallet.controller.js';
import { authenticate, isStaff, isAdmin } from '../middleware/auth.middleware.js';
import { validate, createPatientSchema } from '../middleware/validation.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of patients
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', isStaff, patientController.getAll);

/**
 * @swagger
 * /api/patients/search:
 *   get:
 *     summary: Search patients
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid query
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/search', isStaff, patientController.search);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient details
 *       404:
 *         description: Patient not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', isStaff, patientController.getById);

/**
 * @swagger
 * /api/patients/{id}/referrals:
 *   get:
 *     summary: Get patient referrals
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: List of referrals
 *       404:
 *         description: Patient not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id/referrals', isStaff, patientController.getReferrals);

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Create a new patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePatient'
 *     responses:
 *       201:
 *         description: Patient created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', isStaff, validate(createPatientSchema), patientController.create);

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Update patient details
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePatient'
 *     responses:
 *       200:
 *         description: Patient updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Patient not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:id', isStaff, patientController.update);

// Wallet routes
router.get('/:id/wallet', isStaff, walletController.getWalletDetails);
router.post('/:id/wallet/add-money', isStaff, walletController.addMoney);
router.post('/:id/wallet/purchase-drip', isStaff, walletController.purchaseDrip);

// Admin only for deletion
router.delete('/:id', isAdmin, patientController.delete);

export default router;
