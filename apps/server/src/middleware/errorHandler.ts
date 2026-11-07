import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: err.issues.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  console.error('UNEXPECTED ERROR:', err);

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong on our end.',
  });
};
