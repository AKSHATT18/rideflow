import { Router } from 'express';
import * as driverController from '../controllers/driverController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole('DRIVER'));

// Profile & Vehicle Management
router.get('/profile', driverController.getProfile);
router.put('/profile', driverController.updateProfile);

// Availability & Online Status
router.post('/status', driverController.toggleDriverStatus);
router.put('/availability', driverController.toggleDriverStatus);

// Earnings & Financial Metrics
router.get('/earnings', driverController.getEarnings);

// Trip History with Filters & Pagination
router.get('/trips', driverController.getTrips);

export default router;
