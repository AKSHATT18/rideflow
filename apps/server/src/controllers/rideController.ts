import { Request, Response, NextFunction } from 'express';
import * as rideService from '../services/rideService';
import { createRideSchema } from '../utils/rideValidation';
import { AppError } from '../utils/AppError';

export const createRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'PASSENGER') throw new AppError('Only passengers can create rides', 403);

    const validatedData = createRideSchema.parse(req.body);
    const ride = await rideService.createRide(req.user.userId, validatedData);

    res.status(201).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const getRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const ride = await rideService.getRideById(req.params.id as string, req.user.userId, req.user.role);
    res.status(200).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const getActiveRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const ride = await rideService.getActiveRide(req.user.userId, req.user.role);
    res.status(200).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const getMyRides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const rides = await rideService.getMyRides(req.user.userId, req.user.role);
    res.status(200).json({ status: 'success', data: { rides } });
  } catch (error) {
    next(error);
  }
};

export const getPendingRides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'DRIVER') throw new AppError('Only drivers can fetch pending rides', 403);
    const rides = await rideService.getPendingRides();
    res.status(200).json({ status: 'success', data: { rides } });
  } catch (error) {
    next(error);
  }
};

export const acceptRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'DRIVER') throw new AppError('Only drivers can accept rides', 403);
    const ride = await rideService.acceptRide(req.params.id as string, req.user.userId);
    res.status(200).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const markArrived = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'DRIVER') throw new AppError('Only drivers can mark arrived', 403);
    const ride = await rideService.markDriverArrived(req.params.id as string, req.user.userId);
    res.status(200).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const startTrip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'DRIVER') throw new AppError('Only drivers can start rides', 403);
    const ride = await rideService.startRide(req.params.id as string, req.user.userId);
    res.status(200).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const completeTrip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'DRIVER') throw new AppError('Only drivers can complete rides', 403);
    const ride = await rideService.completeRide(req.params.id as string, req.user.userId);
    res.status(200).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'DRIVER') throw new AppError('Only drivers can update status', 403);
    const { status } = req.body;
    const ride = await rideService.updateRideStatus(req.params.id as string, req.user.userId, status);
    res.status(200).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const cancelRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const ride = await rideService.cancelRide(
      req.params.id as string,
      req.user.userId,
      req.user.role,
      req.body.reason
    );
    res.status(200).json({ status: 'success', data: { ride } });
  } catch (error) {
    next(error);
  }
};

export const getReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const receipt = await rideService.getRideReceipt(
      req.params.id as string,
      req.user.userId,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: { receipt } });
  } catch (error) {
    next(error);
  }
};

export const rateRide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    if (req.user.role !== 'PASSENGER') {
      throw new AppError('Only passengers can submit ratings', 403);
    }
    const { score, comment, tags } = req.body;
    const rating = await rideService.submitRideRating(req.params.id as string, req.user.userId, {
      score,
      comment,
      tags,
    });
    res.status(201).json({ status: 'success', data: { rating } });
  } catch (error) {
    next(error);
  }
};

export const getRideOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const otpData = await rideService.getRideOTP(
      req.params.id as string,
      req.user.userId,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: otpData });
  } catch (error) {
    next(error);
  }
};

export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    if (req.user.role !== 'DRIVER') {
      throw new AppError('Only the assigned driver can verify pickup OTP', 403);
    }
    const { otp } = req.body;
    if (!otp) {
      throw new AppError('Please provide the 4-digit pickup OTP', 400);
    }
    const ride = await rideService.verifyRideOTP(
      req.params.id as string,
      req.user.userId,
      String(otp)
    );
    res.status(200).json({
      status: 'success',
      message: 'Pickup OTP verified successfully. Trip started.',
      data: { ride },
    });
  } catch (error) {
    next(error);
  }
};
