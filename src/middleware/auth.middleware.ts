import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/app-error';

export interface JwtPayload {
  id: number;
  name: string;
  role: 'contributor' | 'maintainer';
}

// Extend default express framework request type parameters safely
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication token missing.'));
  }

  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError(StatusCodes.UNAUTHORIZED, 'Invalid or expired authentication token.'));
  }
};

export const authorize = (...allowedRoles: ('contributor' | 'maintainer')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(StatusCodes.UNAUTHORIZED, 'Authentication required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(StatusCodes.FORBIDDEN, 'Insufficient systemic permissions.'));
    }
    next();
  };
};