import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/app-error';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors })
    });
    return;
  }

  // Handle unique constraint violations from DB
  if ('code' in err && err.code === '23505') {
    res.status(StatusCodes.CONFLICT).json({
      success: false,
      message: 'Resource database conflict detected.',
      errors: 'This unique element already exists.'
    });
    return;
  }

  console.error('Unhandled Exception:', err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'An unexpected internal error occurred.',
    errors: process.env.NODE_ENV === 'development' ? err.message : null
  });
};