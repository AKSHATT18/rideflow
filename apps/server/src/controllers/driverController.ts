import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { AppError } from '../utils/AppError';

export const toggleDriverStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body; // 'ONLINE' | 'OFFLINE'
    if (status !== 'ONLINE' && status !== 'OFFLINE') throw new AppError('Invalid status', 400);

    const driver = await prisma.driverProfile.update({
      where: { userId: req.user!.userId },
      data: { status }
    });

    res.status(200).json({ status: 'success', data: { driver } });
  } catch (error) {
    next(error);
  }
};
