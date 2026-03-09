import { Router } from 'express';
import { dripController } from '../controllers/drip.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', dripController.getAll);
router.get('/:id', dripController.getById);
router.post('/', dripController.create);
router.put('/:id', dripController.update);
router.delete('/:id', dripController.delete);
router.patch('/:id/stock', dripController.updateStock);

export default router;
