import { Router, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const timeEntryRoutes = Router();

timeEntryRoutes.use(authenticate);

/**
 * @swagger
 * /time-entries:
 *   get:
 *     summary: Get all time entries
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
timeEntryRoutes.get(
  '/',
  [
    query('userId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }).withMessage('User ID must be a positive integer'),
    query('projectId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }).withMessage('Project ID must be a positive integer'),
    query('taskId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }).withMessage('Task ID must be a positive integer'),
    query('approvalStatus').optional().isIn(['pending', 'approved', 'rejected', 'changes_requested']).withMessage('Invalid approval status'),
    query('from').optional().isISO8601().withMessage('From date must be ISO8601 format'),
    query('to').optional().isISO8601().withMessage('To date must be ISO8601 format'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('page').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }).withMessage('Page must be a positive integer'),
    query('limit').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1 && num <= 100;
    }).withMessage('Limit must be between 1 and 100'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Time entries validation errors:', errors.array());
        res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
        return;
      }

      const { userId, projectId, taskId, approvalStatus, from, to, search, page, limit } = req.query;
      const pageNum = parseInt((page as string) || '1', 10);
      const limitNum = parseInt((limit as string) || '20', 10);

      let query = db('time_entries')
        .leftJoin('users', 'time_entries.user_id', 'users.id')
        .leftJoin('projects', 'time_entries.project_id', 'projects.id')
        .leftJoin('tasks', 'time_entries.task_id', 'tasks.id')
        .select(
          'time_entries.*',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"),
          'projects.name as project_name',
          'projects.code as project_code',
          'tasks.title as task_title'
        );

      // Engineers can only see their own entries
      if (req.user!.role === 'engineer') {
        query = query.where('time_entries.user_id', req.user!.id);
      } else if (userId) {
        query = query.where('time_entries.user_id', userId as string);
      }

      if (projectId) {
        query = query.where('time_entries.project_id', projectId as string);
      }

      if (taskId) {
        query = query.where('time_entries.task_id', taskId as string);
      }

      if (approvalStatus) {
        query = query.where('time_entries.approval_status', approvalStatus as string);
      }

      if (from) {
        query = query.where('time_entries.start_time', '>=', from as string);
      }

      if (to) {
        query = query.where('time_entries.start_time', '<=', to as string);
      }

      // Search functionality
      if (search) {
        query = query.where(function () {
          this.where('projects.name', 'ilike', `%${search}%`)
            .orWhere('projects.code', 'ilike', `%${search}%`)
            .orWhere('tasks.title', 'ilike', `%${search}%`)
            .orWhere('time_entries.notes', 'ilike', `%${search}%`)
            .orWhere(db.raw("CONCAT(users.first_name, ' ', users.last_name)"), 'ilike', `%${search}%`);
        });
      }

      // Get total count before pagination
      // Create a separate count query to avoid issues with joins
      const countQuery = db('time_entries')
        .leftJoin('users', 'time_entries.user_id', 'users.id')
        .leftJoin('projects', 'time_entries.project_id', 'projects.id')
        .leftJoin('tasks', 'time_entries.task_id', 'tasks.id');

      // Apply same filters to count query
      if (req.user!.role === 'engineer') {
        countQuery.where('time_entries.user_id', req.user!.id);
      } else if (userId) {
        countQuery.where('time_entries.user_id', userId as string);
      }

      if (projectId) {
        countQuery.where('time_entries.project_id', projectId as string);
      }

      if (taskId) {
        countQuery.where('time_entries.task_id', taskId as string);
      }

      if (approvalStatus) {
        countQuery.where('time_entries.approval_status', approvalStatus as string);
      }

      if (from) {
        countQuery.where('time_entries.start_time', '>=', from as string);
      }

      if (to) {
        countQuery.where('time_entries.start_time', '<=', to as string);
      }

      if (search) {
        countQuery.where(function () {
          this.where('projects.name', 'ilike', `%${search}%`)
            .orWhere('projects.code', 'ilike', `%${search}%`)
            .orWhere('tasks.title', 'ilike', `%${search}%`)
            .orWhere('time_entries.notes', 'ilike', `%${search}%`)
            .orWhere(db.raw("CONCAT(users.first_name, ' ', users.last_name)"), 'ilike', `%${search}%`);
        });
      }

      const totalResult = await countQuery.count('* as count').first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Apply pagination
      const offset = (pageNum - 1) * limitNum;
      const entries = await query
        .orderBy('time_entries.start_time', 'desc')
        .limit(limitNum)
        .offset(offset);

      res.json({
        data: entries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      console.error('Get time entries error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * @swagger
 * /time-entries/{id}:
 *   get:
 *     summary: Get time entry by ID
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
timeEntryRoutes.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const entry = await db('time_entries')
      .leftJoin('users', 'time_entries.user_id', 'users.id')
      .leftJoin('projects', 'time_entries.project_id', 'projects.id')
      .leftJoin('tasks', 'time_entries.task_id', 'tasks.id')
      .where('time_entries.id', id)
      .select(
        'time_entries.*',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"),
        'projects.name as project_name',
        'projects.code as project_code',
        'tasks.title as task_title'
      )
      .first();

    if (!entry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }

    // Engineers can only view their own entries
    if (req.user!.role === 'engineer' && entry.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    res.json(entry);
  } catch (error) {
    console.error('Get time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /time-entries:
 *   post:
 *     summary: Create time entry (manual or timer)
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
timeEntryRoutes.post(
  '/',
  [
    body('projectId').isInt(),
    body('startTime').isISO8601(),
    body('durationHours').isFloat({ min: 0 }),
    body('taskId').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { projectId, taskId, startTime, endTime, durationHours, notes } = req.body;

      // Verify project exists
      const project = await db('projects').where({ id: projectId }).first();
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Verify task exists if provided
      if (taskId) {
        const task = await db('tasks').where({ id: taskId }).first();
        if (!task) {
          res.status(404).json({ error: 'Task not found' });
          return;
        }
      }

      const [entry] = await db('time_entries')
        .insert({
          user_id: req.user!.id,
          project_id: projectId,
          task_id: taskId || null,
          start_time: startTime,
          end_time: endTime || null,
          duration_hours: durationHours,
          notes: notes || null,
          approval_status: 'pending',
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'time_entry',
        entityId: entry.id,
        newValues: { projectId, durationHours },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(entry);
    } catch (error) {
      console.error('Create time entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /time-entries/{id}:
 *   put:
 *     summary: Update time entry
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
timeEntryRoutes.put(
  '/:id',
  [
    body('startTime').optional().isISO8601(),
    body('durationHours').optional().isFloat({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const existingEntry = await db('time_entries').where({ id }).first();

      if (!existingEntry) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }

      // Engineers can only update their own pending entries
      if (req.user!.role === 'engineer') {
        if (existingEntry.user_id !== req.user!.id) {
          res.status(403).json({ error: 'Insufficient permissions' });
          return;
        }
        if (existingEntry.approval_status !== 'pending') {
          res.status(400).json({ error: 'Cannot update approved/rejected entries' });
          return;
        }
      }

      const { startTime, endTime, durationHours, notes } = req.body;

      const updateData: any = {};
      if (startTime) updateData.start_time = startTime;
      if (endTime !== undefined) updateData.end_time = endTime;
      if (durationHours !== undefined) updateData.duration_hours = durationHours;
      if (notes !== undefined) updateData.notes = notes;

      const [updatedEntry] = await db('time_entries')
        .where({ id })
        .update(updateData)
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'update',
        entityType: 'time_entry',
        entityId: parseInt(id),
        oldValues: existingEntry,
        newValues: updateData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error('Update time entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /time-entries/{id}:
 *   delete:
 *     summary: Delete time entry
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
timeEntryRoutes.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const entry = await db('time_entries').where({ id }).first();
    if (!entry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }

    // Only allow deletion of pending entries by the owner or admins/supervisors
    if (entry.approval_status !== 'pending' && req.user!.role !== 'admin' && req.user!.role !== 'supervisor') {
      res.status(403).json({ error: 'Can only delete pending time entries' });
      return;
    }

    // Engineers can only delete their own entries
    if (req.user!.role === 'engineer' && entry.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    await db('time_entries').where({ id }).delete();

    await createAuditLog({
      userId: req.user!.id,
      action: 'delete',
      entityType: 'time_entry',
      entityId: parseInt(id),
      oldValues: entry,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /time-entries/{id}:
 *   delete:
 *     summary: Delete time entry
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
timeEntryRoutes.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existingEntry = await db('time_entries').where({ id }).first();

    if (!existingEntry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }

    // Engineers can only delete their own pending entries
    if (req.user!.role === 'engineer') {
      if (existingEntry.user_id !== req.user!.id) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      if (existingEntry.approval_status !== 'pending') {
        res.status(400).json({ error: 'Cannot delete approved/rejected entries' });
        return;
      }
    }

    await db('time_entries').where({ id }).delete();

    await createAuditLog({
      userId: req.user!.id,
      action: 'delete',
      entityType: 'time_entry',
      entityId: parseInt(id),
      oldValues: existingEntry,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

