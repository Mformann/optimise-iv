import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthenticatedRequest, JwtPayload, UserRole } from '../types/index.js';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const isAdmin = authorize('admin');
export const isDoctor = authorize('doctor');
export const isReception = authorize('reception');
export const isNurse = authorize('nurse');
export const isAdminOrDoctor = authorize('admin', 'doctor');
export const isAdminOrReception = authorize('admin', 'reception');
export const isAdminOrNurse = authorize('admin', 'nurse');
export const isAdminDoctorOrNurse = authorize('admin', 'doctor', 'nurse');
export const isStaff = authorize('admin', 'doctor', 'reception', 'nurse');
