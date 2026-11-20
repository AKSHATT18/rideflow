import { Router } from 'express';
import * as passengerController from '../controllers/passengerController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole('PASSENGER'));

// Profile
router.get('/profile', passengerController.getProfile);
router.put('/profile', passengerController.updateProfile);

// Saved locations
router.get('/saved-locations', passengerController.getSavedLocations);
router.post('/saved-locations', passengerController.createSavedLocation);
router.put('/saved-locations/:id', passengerController.updateSavedLocation);
router.delete('/saved-locations/:id', passengerController.deleteSavedLocation);

// Ride history
router.get('/history', passengerController.getRideHistory);

export default router;
