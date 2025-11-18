import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const auditRoutes = Router();

auditRoutes.use(authenticate);
auditRoutes.use(authorize('admin', 'supervisor'));

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 */
auditRoutes.get(
  '/',
  [
    query('userId').optional().isInt(),
    query('action').optional().isString(),
    query('entityType').optional().isString(),
    query('entityId').optional().isInt(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId, action, entityType, entityId, from, to } = req.query;
      const limit = parseInt((req.query.limit as string) || '100');

      let query = db('audit_logs')
        .leftJoin('users', 'audit_logs.user_id', 'users.id')
        .select(
          'audit_logs.*',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"),
          'users.email as user_email'
        );

      if (userId) {
        query = query.where('audit_logs.user_id', userId as string);
      }

      if (action) {
        query = query.where('audit_logs.action', action as string);
      }

      if (entityType) {
        query = query.where('audit_logs.entity_type', entityType as string);
      }

      if (entityId) {
        query = query.where('audit_logs.entity_id', entityId as string);
      }

      if (from) {
        query = query.where('audit_logs.created_at', '>=', from as string);
      }

      if (to) {
        query = query.where('audit_logs.created_at', '<=', to as string);
      }

      const logs = await query
        .orderBy('audit_logs.created_at', 'desc')
        .limit(limit);

      res.json(logs);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

