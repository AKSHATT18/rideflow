import { Router } from 'express';
import * as driverController from '../controllers/driverController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.post('/status', requireRole('DRIVER'), driverController.toggleDriverStatus);

export default router;
