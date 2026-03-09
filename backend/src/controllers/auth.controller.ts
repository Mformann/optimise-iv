import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { userRepository } from '../repositories/user.repository.js';
import { AuthenticatedRequest, JwtPayload } from '../types/index.js';

export const authController = {
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await userRepository.findByEmail(email);
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      if (!user.is_active) {
        res.status(401).json({ success: false, error: 'Account is deactivated' });
        return;
      }

      const isValidPassword = await userRepository.verifyPassword(user, password);
      if (!isValidPassword) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn as any,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async signup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, name, role, phone } = req.body;

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        res.status(400).json({ success: false, error: 'Email already in use' });
        return;
      }

      // Create new user
      const user = await userRepository.create({
        email,
        password,
        name,
        role: role || 'patient',
        phone,
      });

      // Generate token
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn as any,
      });

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
          },
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          is_active: user.is_active === 1,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
