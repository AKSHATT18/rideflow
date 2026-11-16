import { Router } from 'express';
import * as rideController from '../controllers/rideController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// Collection routes
router.post('/', requireRole('PASSENGER'), rideController.createRide);
router.get('/active', rideController.getActiveRide);
router.get('/my-rides', rideController.getMyRides);
router.get('/pending', requireRole('DRIVER'), rideController.getPendingRides);

// Parameterized member routes
router.get('/:id', rideController.getRide);
router.post('/:id/accept', requireRole('DRIVER'), rideController.acceptRide);
router.post('/:id/arrive', requireRole('DRIVER'), rideController.markArrived);
router.post('/:id/start', requireRole('DRIVER'), rideController.startTrip);
router.post('/:id/complete', requireRole('DRIVER'), rideController.completeTrip);
router.post('/:id/status', requireRole('DRIVER'), rideController.updateStatus);
router.post('/:id/cancel', rideController.cancelRide);

export default router;
