import { Router, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { db } from '../db';
import { AuthRequest, authenticate } from '../middleware/auth';

const notificationRoutes = Router();

// Apply authentication to all notification routes
notificationRoutes.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
notificationRoutes.get(
  '/',
  [query('unreadOnly').optional().isBoolean()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { unreadOnly } = req.query;
      let notificationsQuery = db('notifications').where('user_id', req.user!.id);

      if (unreadOnly === 'true') {
        notificationsQuery = notificationsQuery.where('is_read', false);
      }

      const notifications = await notificationsQuery.orderBy('created_at', 'desc').limit(100);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
    }
  }
);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
notificationRoutes.get('/unread-count', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await db('notifications')
      .where({ user_id: req.user!.id, is_read: false })
      .count('* as count')
      .first();

    res.json({ count: parseInt(count?.count as string) || 0 });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
    }
});

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
notificationRoutes.put(
  '/:id/read',
  [param('id').isInt()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      const notification = await db('notifications')
        .where({ id, user_id: req.user!.id })
        .first();

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      await db('notifications')
        .where({ id })
        .update({ is_read: true, read_at: db.fn.now() });

      res.json({ success: true });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
notificationRoutes.put('/read-all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db('notifications')
      .where({ user_id: req.user!.id, is_read: false })
      .update({ is_read: true, read_at: db.fn.now() });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default notificationRoutes;

