import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response.utils';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const registeredUser = await AuthService.registerUser(req.body);
    sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', registeredUser);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const loginPayload = await AuthService.authenticateLogin(req.body);
    sendSuccess(res, StatusCodes.OK, 'Login successful', loginPayload);
  } catch (error) {
    next(error);
  }
};