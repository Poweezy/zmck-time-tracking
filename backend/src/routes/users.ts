import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const userRoutes = Router();

userRoutes.use(authenticate);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
userRoutes.get('/', authorize('admin', 'supervisor'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'hourly_rate', 'is_active', 'created_at', 'updated_at')
      .orderBy('last_name', 'asc');

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
userRoutes.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin/supervisor
    if (req.user!.role !== 'admin' && req.user!.role !== 'supervisor' && req.user!.id !== parseInt(id)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const user = await db('users')
      .where({ id })
      .select('id', 'email', 'first_name', 'last_name', 'role', 'hourly_rate', 'is_active', 'created_at', 'updated_at')
      .first();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
userRoutes.post(
  '/',
  authorize('admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('role').isIn(['admin', 'supervisor', 'engineer']),
    body('hourlyRate').optional().isFloat({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, firstName, lastName, role, hourlyRate } = req.body;

      const existingUser = await db('users').where({ email }).first();
      if (existingUser) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [user] = await db('users')
        .insert({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role,
          hourly_rate: hourlyRate || null,
        })
        .returning(['id', 'email', 'first_name', 'last_name', 'role', 'hourly_rate', 'is_active']);

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'user',
        entityId: user.id,
        newValues: { email, role },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(user);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
userRoutes.put(
  '/:id',
  authorize('admin'),
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('firstName').optional().notEmpty(),
    body('lastName').optional().notEmpty(),
    body('role').optional().isIn(['admin', 'supervisor', 'engineer']),
    body('hourlyRate').optional().isFloat({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { email, password, firstName, lastName, role, hourlyRate, isActive } = req.body;

      const existingUser = await db('users').where({ id }).first();
      if (!existingUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updateData: any = {};
      if (email) updateData.email = email;
      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (role) updateData.role = role;
      if (hourlyRate !== undefined) updateData.hourly_rate = hourlyRate;
      if (isActive !== undefined) updateData.is_active = isActive;
      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10);
      }

      const [updatedUser] = await db('users')
        .where({ id })
        .update(updateData)
        .returning(['id', 'email', 'first_name', 'last_name', 'role', 'hourly_rate', 'is_active']);

      await createAuditLog({
        userId: req.user!.id,
        action: 'update',
        entityType: 'user',
        entityId: parseInt(id),
        oldValues: existingUser,
        newValues: updateData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

