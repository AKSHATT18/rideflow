import { Request, Response, NextFunction } from 'express';
import * as passengerService from '../services/passengerService';
import { AppError } from '../utils/AppError';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const profile = await passengerService.getPassengerProfile(req.user.userId);
    res.status(200).json({ status: 'success', data: { profile } });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const updated = await passengerService.updatePassengerProfile(req.user.userId, req.body);
    res.status(200).json({ status: 'success', data: { user: updated } });
  } catch (error) {
    next(error);
  }
};

export const getSavedLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const locations = await passengerService.getSavedLocations(req.user.userId);
    res.status(200).json({ status: 'success', data: { locations } });
  } catch (error) {
    next(error);
  }
};

export const createSavedLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const location = await passengerService.createSavedLocation(req.user.userId, req.body);
    res.status(201).json({ status: 'success', data: { location } });
  } catch (error) {
    next(error);
  }
};

export const updateSavedLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const location = await passengerService.updateSavedLocation(
      req.user.userId,
      req.params.id as string,
      req.body
    );
    res.status(200).json({ status: 'success', data: { location } });
  } catch (error) {
    next(error);
  }
};

export const deleteSavedLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    await passengerService.deleteSavedLocation(req.user.userId, req.params.id as string);
    res.status(200).json({ status: 'success', message: 'Saved location deleted' });
  } catch (error) {
    next(error);
  }
};

export const getRideHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { status, startDate, endDate, page, limit } = req.query;

    const history = await passengerService.getPassengerRideHistory(req.user.userId, {
      status: status as any,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({ status: 'success', data: history });
  } catch (error) {
    next(error);
  }
};
