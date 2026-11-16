import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import rideRoutes from './ride';
import driverRoutes from './driver';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'rideflow-api'
  });
});

router.use('/auth', authRoutes);
router.use('/rides', rideRoutes);
router.use('/driver', driverRoutes);

export default router;
