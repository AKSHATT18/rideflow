import { Request, Response, NextFunction } from 'express';
import * as driverService from '../services/driverService';
import {
  updateDriverProfileSchema,
  updateDriverAvailabilitySchema,
  driverTripsQuerySchema,
} from '../utils/driverValidation';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await driverService.getDriverProfile(req.user!.userId);
    res.status(200).json({ status: 'success', data: { profile } });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateDriverProfileSchema.parse(req.body);
    const profile = await driverService.updateDriverProfile(req.user!.userId, input);
    res.status(200).json({
      status: 'success',
      data: { profile, message: 'Driver profile updated successfully' },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleDriverStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = updateDriverAvailabilitySchema.parse(req.body);
    const result = await driverService.updateDriverAvailability(req.user!.userId, status);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getEarnings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const earnings = await driverService.getDriverEarnings(req.user!.userId);
    res.status(200).json({ status: 'success', data: { earnings } });
  } catch (error) {
    next(error);
  }
};

export const getTrips = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = driverTripsQuerySchema.parse(req.query);
    const result = await driverService.getDriverTrips(req.user!.userId, query);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};
