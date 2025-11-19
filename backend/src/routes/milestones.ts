import { Router, Response } from 'express';
import { body, query, validationResult, param } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const milestoneRoutes = Router();
milestoneRoutes.use(authenticate);

/**
 * @swagger
 * /milestones:
 *   get:
 *     summary: Get all milestones
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 */
milestoneRoutes.get(
  '/',
  [
    query('projectId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }),
    query('status').optional().isIn(['upcoming', 'in_progress', 'completed', 'overdue']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { projectId, status } = req.query;

      let query = db('milestones')
        .leftJoin('projects', 'milestones.project_id', 'projects.id')
        .leftJoin('users', 'milestones.created_by', 'users.id')
        .select(
          'milestones.*',
          'projects.name as project_name',
          'projects.code as project_code',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
        );

      if (projectId) {
        query = query.where('milestones.project_id', projectId as string);
      }

      if (status) {
        query = query.where('milestones.status', status as string);
      }

      // Update status based on dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const milestones = await query.orderBy('milestones.target_date', 'asc');

      // Update overdue milestones
      for (const milestone of milestones) {
        if (milestone.status !== 'completed' && new Date(milestone.target_date) < today) {
          await db('milestones')
            .where({ id: milestone.id })
            .update({ status: 'overdue' });
          milestone.status = 'overdue';
        }
      }

      res.json(milestones);
    } catch (error: any) {
      console.error('Error fetching milestones:', error);
      res.status(500).json({ error: 'Failed to fetch milestones', details: error.message });
    }
  }
);

/**
 * @swagger
 * /milestones:
 *   post:
 *     summary: Create a new milestone
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 */
milestoneRoutes.post(
  '/',
  [
    body('projectId').isInt().withMessage('Project ID is required'),
    body('name').isString().isLength({ min: 1, max: 200 }).withMessage('Name is required'),
    body('targetDate').isISO8601().withMessage('Valid target date is required'),
    body('description').optional().isString(),
    authorize('admin', 'supervisor'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { projectId, name, description, targetDate } = req.body;

      // Verify project exists
      const project = await db('projects').where({ id: projectId }).first();
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);

      const status = target < today ? 'overdue' : 'upcoming';

      const [milestone] = await db('milestones')
        .insert({
          project_id: projectId,
          name,
          description: description || null,
          target_date: targetDate,
          status,
          created_by: req.user!.id,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'milestone',
        entityId: milestone.id,
        details: { projectId, name },
      });

      res.status(201).json(milestone);
    } catch (error: any) {
      console.error('Error creating milestone:', error);
      res.status(500).json({ error: 'Failed to create milestone', details: error.message });
    }
  }
);

/**
 * @swagger
 * /milestones/:id/complete:
 *   put:
 *     summary: Mark milestone as completed
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 */
milestoneRoutes.put(
  '/:id/complete',
  [param('id').isInt(), authorize('admin', 'supervisor')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const milestone = await db('milestones').where({ id }).first();
      if (!milestone) {
        res.status(404).json({ error: 'Milestone not found' });
        return;
      }

      await db('milestones')
        .where({ id })
        .update({
          status: 'completed',
          completed_date: new Date(),
        });

      await createAuditLog({
        userId: req.user!.id,
        action: 'complete',
        entityType: 'milestone',
        entityId: parseInt(id),
      });

      res.json({ message: 'Milestone marked as completed' });
    } catch (error: any) {
      console.error('Error completing milestone:', error);
      res.status(500).json({ error: 'Failed to complete milestone', details: error.message });
    }
  }
);

/**
 * @swagger
 * /milestones/:id:
 *   delete:
 *     summary: Delete a milestone
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 */
milestoneRoutes.delete(
  '/:id',
  [param('id').isInt(), authorize('admin', 'supervisor')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const milestone = await db('milestones').where({ id }).first();
      if (!milestone) {
        res.status(404).json({ error: 'Milestone not found' });
        return;
      }

      await db('milestones').where({ id }).delete();

      await createAuditLog({
        userId: req.user!.id,
        action: 'delete',
        entityType: 'milestone',
        entityId: parseInt(id),
      });

      res.json({ message: 'Milestone deleted' });
    } catch (error: any) {
      console.error('Error deleting milestone:', error);
      res.status(500).json({ error: 'Failed to delete milestone', details: error.message });
    }
  }
);

