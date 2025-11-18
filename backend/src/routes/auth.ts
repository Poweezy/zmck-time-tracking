import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { db } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const authRoutes = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
authRoutes.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      const user = await db('users')
        .where({ email, is_active: true })
        .first();

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      await createAuditLog({
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          hourlyRate: user.hourly_rate,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 */
authRoutes.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await db('users')
      .where({ id: req.user!.id, is_active: true })
      .first();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      hourlyRate: user.hourly_rate,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

