import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller.js';
import { authenticate, isStaff, isAdminOrDoctor, isAdminOrReception } from '../middleware/auth.middleware.js';
import { validate, createAppointmentSchema } from '../middleware/validation.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get all appointments
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of appointments
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', isStaff, appointmentController.getAll);

/**
 * @swagger
 * /api/appointments/calendar:
 *   get:
 *     summary: Get appointments calendar
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointments calendar
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/calendar', isStaff, appointmentController.getCalendar);

/**
 * @swagger
 * /api/appointments/today:
 *   get:
 *     summary: Get today's appointments
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's appointments
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/today', isStaff, appointmentController.getToday);

/**
 * @swagger
 * /api/appointments/stats:
 *   get:
 *     summary: Get appointment statistics
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointment statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', isStaff, appointmentController.getStats);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment details
 *       404:
 *         description: Appointment not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', isStaff, appointmentController.getById);

// Create appointments (reception and admin)
router.post('/', isStaff, validate(createAppointmentSchema), appointmentController.create);
router.post('/quick', isStaff, appointmentController.createQuick);

// Update appointments
router.put('/:id', isStaff, appointmentController.update);
router.put('/:id/status', isStaff, appointmentController.updateStatus);
router.post('/:id/start', isAdminOrDoctor, appointmentController.start);
router.post('/:id/payment-preview', isAdminOrDoctor, appointmentController.getPaymentPreview);
router.post('/:id/complete', isAdminOrDoctor, appointmentController.complete);
router.post('/:id/cancel', isStaff, appointmentController.cancel);

// Non-clinic workflow
router.post('/non-clinic', isStaff, appointmentController.createNonClinic);
router.get('/non-clinic/pipeline', isStaff, appointmentController.getNonClinicPipeline);
router.post('/:id/assign-nurse', isAdminOrReception, appointmentController.assignNurse);
router.post('/:id/preparing', isStaff, appointmentController.markPreparing);
router.post('/:id/dispatch', isStaff, appointmentController.markDispatched);

// Delete (admin only)
router.delete('/:id', isStaff, appointmentController.delete);

export default router;
