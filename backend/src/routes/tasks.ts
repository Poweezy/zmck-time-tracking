import { Router, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const taskRoutes = Router();

taskRoutes.use(authenticate);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
taskRoutes.get(
  '/',
  [
    query('projectId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }).withMessage('Project ID must be a positive integer'),
    query('assignedTo').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }).withMessage('Assigned To must be a positive integer'),
    query('status').optional().isIn(['todo', 'in_progress', 'review', 'done']).withMessage('Invalid status value'),
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
        res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
        return;
      }

      const { projectId, assignedTo, status, search, page, limit } = req.query;
      const pageNum = parseInt((page as string) || '1');
      const limitNum = parseInt((limit as string) || '20');

      let query = db('tasks')
        .leftJoin('projects', 'tasks.project_id', 'projects.id')
        .leftJoin('users as assignee', 'tasks.assigned_to', 'assignee.id')
        .select(
          'tasks.*',
          'projects.name as project_name',
          'projects.code as project_code',
          db.raw("CONCAT(assignee.first_name, ' ', assignee.last_name) as assignee_name")
        );

      if (projectId) {
        query = query.where('tasks.project_id', projectId as string);
      }

      if (assignedTo) {
        query = query.where('tasks.assigned_to', assignedTo as string);
      } else if (req.user!.role === 'engineer') {
        // Engineers only see their own tasks
        query = query.where('tasks.assigned_to', req.user!.id);
      }

      if (status) {
        query = query.where('tasks.status', status as string);
      }

      // Search functionality
      if (search) {
        query = query.where(function () {
          this.where('tasks.title', 'ilike', `%${search}%`)
            .orWhere('tasks.description', 'ilike', `%${search}%`)
            .orWhere('projects.name', 'ilike', `%${search}%`)
            .orWhere('projects.code', 'ilike', `%${search}%`);
        });
      }

      // Get total count before pagination
      // Create a separate count query to avoid issues with joins
      let countQuery = db('tasks')
        .leftJoin('projects', 'tasks.project_id', 'projects.id')
        .leftJoin('users as assignee', 'tasks.assigned_to', 'assignee.id');

      if (projectId) {
        countQuery = countQuery.where('tasks.project_id', projectId as string);
      }

      if (assignedTo) {
        countQuery = countQuery.where('tasks.assigned_to', assignedTo as string);
      } else if (req.user!.role === 'engineer') {
        countQuery = countQuery.where('tasks.assigned_to', req.user!.id);
      }

      if (status) {
        countQuery = countQuery.where('tasks.status', status as string);
      }

      if (search) {
        countQuery = countQuery.where(function () {
          this.where('tasks.title', 'ilike', `%${search}%`)
            .orWhere('tasks.description', 'ilike', `%${search}%`)
            .orWhere('projects.name', 'ilike', `%${search}%`)
            .orWhere('projects.code', 'ilike', `%${search}%`);
        });
      }

      const totalResult = await countQuery.count('* as count').first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Apply pagination
      const offset = (pageNum - 1) * limitNum;
      const tasks = await query
        .orderBy('tasks.created_at', 'desc')
        .limit(limitNum)
        .offset(offset);

      res.json({
        data: tasks,
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
      console.error('Get tasks error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
taskRoutes.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await db('tasks')
      .leftJoin('projects', 'tasks.project_id', 'projects.id')
      .leftJoin('users as assignee', 'tasks.assigned_to', 'assignee.id')
      .where('tasks.id', id)
      .select(
        'tasks.*',
        'projects.name as project_name',
        'projects.code as project_code',
        db.raw("CONCAT(assignee.first_name, ' ', assignee.last_name) as assignee_name")
      )
      .first();

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Engineers can only view their own tasks
    if (req.user!.role === 'engineer' && task.assigned_to !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
taskRoutes.post(
  '/',
  authorize('admin', 'supervisor'),
  [
    body('projectId').isInt(),
    body('title').notEmpty(),
    body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
    body('estimatedHours').optional().isFloat({ min: 0 }),
    body('assignedTo').optional().isInt(),
    body('priority').optional().isInt({ min: 0, max: 5 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        projectId,
        title,
        description,
        assignedTo,
        estimatedHours,
        status,
        dueDate,
        priority,
      } = req.body;

      // Verify project exists
      const project = await db('projects').where({ id: projectId }).first();
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const [task] = await db('tasks')
        .insert({
          project_id: projectId,
          title,
          description: description || null,
          assigned_to: assignedTo || null,
          estimated_hours: estimatedHours || null,
          status: status || 'todo',
          due_date: dueDate || null,
          priority: priority || 0,
          progress_percentage: 0,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'task',
        entityId: task.id,
        newValues: { title, projectId, status },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(task);
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
taskRoutes.put(
  '/:id',
  [
    body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
    body('progressPercentage').optional().isInt({ min: 0, max: 100 }),
    body('priority').optional().isInt({ min: 0, max: 5 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const existingTask = await db('tasks').where({ id }).first();

      if (!existingTask) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // Engineers can only update their own tasks and only certain fields
      if (req.user!.role === 'engineer') {
        if (existingTask.assigned_to !== req.user!.id) {
          res.status(403).json({ error: 'Insufficient permissions' });
          return;
        }
        // Engineers can only update status and progress
        const allowedFields = ['status', 'progressPercentage'];
        const updateFields = Object.keys(req.body);
        if (updateFields.some((field) => !allowedFields.includes(field))) {
          res.status(403).json({ error: 'You can only update status and progress' });
          return;
        }
      }

      const {
        title,
        description,
        assignedTo,
        estimatedHours,
        status,
        progressPercentage,
        dueDate,
        priority,
      } = req.body;

      const updateData: any = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (assignedTo !== undefined && req.user!.role !== 'engineer') updateData.assigned_to = assignedTo;
      if (estimatedHours !== undefined && req.user!.role !== 'engineer') updateData.estimated_hours = estimatedHours;
      if (status) updateData.status = status;
      if (progressPercentage !== undefined) updateData.progress_percentage = progressPercentage;
      if (dueDate !== undefined && req.user!.role !== 'engineer') updateData.due_date = dueDate;
      if (priority !== undefined && req.user!.role !== 'engineer') updateData.priority = priority;

      const [updatedTask] = await db('tasks')
        .where({ id })
        .update(updateData)
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'update',
        entityType: 'task',
        entityId: parseInt(id),
        oldValues: existingTask,
        newValues: updateData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(updatedTask);
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

