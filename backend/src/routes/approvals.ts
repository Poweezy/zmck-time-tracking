import { Router, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';
import { createNotification } from '../utils/notificationService';

export const approvalRoutes = Router();

approvalRoutes.use(authenticate);
approvalRoutes.use(authorize('admin', 'supervisor'));

/**
 * @swagger
 * /approvals/pending:
 *   get:
 *     summary: Get pending time entries for approval
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 */
approvalRoutes.get(
  '/pending',
  [query('userId').optional().isInt(), query('projectId').optional().isInt()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId, projectId } = req.query;

      let query = db('time_entries')
        .leftJoin('users', 'time_entries.user_id', 'users.id')
        .leftJoin('projects', 'time_entries.project_id', 'projects.id')
        .leftJoin('tasks', 'time_entries.task_id', 'tasks.id')
        .where('time_entries.approval_status', 'pending')
        .select(
          'time_entries.*',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"),
          'users.email as user_email',
          'projects.name as project_name',
          'projects.code as project_code',
          'tasks.title as task_title'
        );

      if (userId) {
        query = query.where('time_entries.user_id', userId as string);
      }

      if (projectId) {
        query = query.where('time_entries.project_id', projectId as string);
      }

      const entries = await query.orderBy('time_entries.start_time', 'desc');

      res.json(entries);
    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /approvals/{id}/approve:
 *   put:
 *     summary: Approve time entry
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 */
approvalRoutes.put(
  '/:id/approve',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const entry = await db('time_entries').where({ id }).first();

      if (!entry) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }

      if (entry.approval_status !== 'pending') {
        res.status(400).json({ error: 'Time entry is not pending approval' });
        return;
      }

      const [updatedEntry] = await db('time_entries')
        .where({ id })
        .update({
          approval_status: 'approved',
          approved_by: req.user!.id,
          approved_at: new Date(),
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'approve',
        entityType: 'time_entry',
        entityId: parseInt(id),
        oldValues: entry,
        newValues: { approval_status: 'approved' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Create notification for the user
      await createNotification({
        userId: entry.user_id,
        type: 'time_entry_approved',
        title: 'Time entry approved',
        message: `Your time entry (${entry.duration_hours}h) has been approved`,
        entityType: 'time_entry',
        entityId: parseInt(id),
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error('Approve time entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /approvals/{id}/reject:
 *   put:
 *     summary: Reject time entry
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 */
approvalRoutes.put(
  '/:id/reject',
  [body('rejectionReason').notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { rejectionReason } = req.body;

      const entry = await db('time_entries').where({ id }).first();

      if (!entry) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }

      if (entry.approval_status !== 'pending') {
        res.status(400).json({ error: 'Time entry is not pending approval' });
        return;
      }

      const [updatedEntry] = await db('time_entries')
        .where({ id })
        .update({
          approval_status: 'rejected',
          approved_by: req.user!.id,
          approved_at: new Date(),
          rejection_reason: rejectionReason,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'reject',
        entityType: 'time_entry',
        entityId: parseInt(id),
        oldValues: entry,
        newValues: { approval_status: 'rejected', rejection_reason: rejectionReason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Create notification for the user
      await createNotification({
        userId: entry.user_id,
        type: 'time_entry_rejected',
        title: 'Time entry rejected',
        message: `Your time entry (${entry.duration_hours}h) has been rejected. Reason: ${rejectionReason}`,
        entityType: 'time_entry',
        entityId: parseInt(id),
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error('Reject time entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /approvals/{id}/request-changes:
 *   put:
 *     summary: Request changes for time entry
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 */
approvalRoutes.put(
  '/:id/request-changes',
  [body('rejectionReason').notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { rejectionReason } = req.body;

      const entry = await db('time_entries').where({ id }).first();

      if (!entry) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }

      if (entry.approval_status !== 'pending') {
        res.status(400).json({ error: 'Time entry is not pending approval' });
        return;
      }

      const [updatedEntry] = await db('time_entries')
        .where({ id })
        .update({
          approval_status: 'changes_requested',
          approved_by: req.user!.id,
          approved_at: new Date(),
          rejection_reason: rejectionReason,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'request_changes',
        entityType: 'time_entry',
        entityId: parseInt(id),
        oldValues: entry,
        newValues: { approval_status: 'changes_requested', rejection_reason: rejectionReason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Create notification for the user
      await createNotification({
        userId: entry.user_id,
        type: 'time_entry_changes_requested',
        title: 'Changes requested for time entry',
        message: `Changes have been requested for your time entry (${entry.duration_hours}h). Reason: ${rejectionReason}`,
        entityType: 'time_entry',
        entityId: parseInt(id),
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error('Request changes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /approvals/bulk-approve:
 *   post:
 *     summary: Bulk approve time entries
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 */
approvalRoutes.post(
  '/bulk-approve',
  [body('entryIds').isArray().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { entryIds } = req.body;

      const updated = await db('time_entries')
        .whereIn('id', entryIds)
        .where('approval_status', 'pending')
        .update({
          approval_status: 'approved',
          approved_by: req.user!.id,
          approved_at: new Date(),
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'bulk_approve',
        entityType: 'time_entry',
        newValues: { entryIds, count: updated.length },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Create notifications for all users whose entries were approved
      const userIds = [...new Set(updated.map((e: any) => e.user_id))];
      for (const userId of userIds) {
        const userEntries = updated.filter((e: any) => e.user_id === userId);
        await createNotification({
          userId,
          type: 'time_entry_approved',
          title: `${userEntries.length} time entry${userEntries.length > 1 ? 'ies' : ''} approved`,
          message: `${userEntries.length} of your time entries have been approved`,
          entityType: 'time_entry',
        });
      }

      res.json({ approved: updated.length, entries: updated });
    } catch (error) {
      console.error('Bulk approve error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

