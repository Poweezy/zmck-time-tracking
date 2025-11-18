import { Router, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const projectRoutes = Router();

projectRoutes.use(authenticate);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
projectRoutes.get(
  '/',
  [
    query('status').optional().isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled']).withMessage('Invalid status value'),
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
        console.error('Projects validation errors:', errors.array());
        res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
        return;
      }

      const { status, search, page, limit } = req.query;
      const pageNum = parseInt((page as string) || '1', 10);
      const limitNum = parseInt((limit as string) || '20', 10);
      
      // Validate parsed values
      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({ error: 'Invalid page number' });
        return;
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({ error: 'Invalid limit value' });
        return;
      }

      let query = db('projects')
        .leftJoin('users as manager', 'projects.manager_id', 'manager.id')
        .select(
          'projects.*',
          db.raw("CONCAT(manager.first_name, ' ', manager.last_name) as manager_name")
        );

      if (status) {
        query = query.where('projects.status', status as string);
      }

      // Search functionality
      if (search) {
        query = query.where(function () {
          this.where('projects.name', 'ilike', `%${search}%`)
            .orWhere('projects.code', 'ilike', `%${search}%`)
            .orWhere('projects.client', 'ilike', `%${search}%`);
        });
      }

      // Engineers can only see active projects assigned to them
      if (req.user!.role === 'engineer') {
        query = query
          .leftJoin('tasks', 'projects.id', 'tasks.project_id')
          .where('projects.status', 'active')
          .where('tasks.assigned_to', req.user!.id)
          .groupBy('projects.id', 'manager.id');
      }

      // Get total count before pagination
      // Create a separate count query to avoid issues with joins
      let countQuery = db('projects')
        .leftJoin('users as manager', 'projects.manager_id', 'manager.id');

      if (status) {
        countQuery = countQuery.where('projects.status', status as string);
      }

      if (search) {
        countQuery = countQuery.where(function () {
          this.where('projects.name', 'ilike', `%${search}%`)
            .orWhere('projects.code', 'ilike', `%${search}%`)
            .orWhere('projects.client', 'ilike', `%${search}%`);
        });
      }

      if (req.user!.role === 'engineer') {
        countQuery = countQuery
          .leftJoin('tasks', 'projects.id', 'tasks.project_id')
          .where('projects.status', 'active')
          .where('tasks.assigned_to', req.user!.id)
          .groupBy('projects.id', 'manager.id');
      }

      const totalResult = await countQuery.count('* as count').first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Apply pagination
      const offset = (pageNum - 1) * limitNum;
      const projects = await query
        .orderBy('projects.created_at', 'desc')
        .limit(limitNum)
        .offset(offset);

      res.json({
        data: projects,
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
      console.error('Get projects error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
projectRoutes.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await db('projects')
      .leftJoin('users as manager', 'projects.manager_id', 'manager.id')
      .where('projects.id', id)
      .select(
        'projects.*',
        db.raw("CONCAT(manager.first_name, ' ', manager.last_name) as manager_name")
      )
      .first();

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
projectRoutes.post(
  '/',
  authorize('admin', 'supervisor'),
  [
    body('name').notEmpty(),
    body('code').notEmpty(),
    body('client').notEmpty(),
    body('type').isIn(['FIXED', 'OPEN', 'HYBRID']),
    body('status').optional().isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
    body('allocatedHours').optional().isFloat({ min: 0 }),
    body('budgetAmount').optional().isFloat({ min: 0 }),
    body('managerId').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        name,
        code,
        client,
        managerId,
        allocatedHours,
        budgetAmount,
        type,
        status,
        description,
        startDate,
        endDate,
      } = req.body;

      const existingProject = await db('projects').where({ code }).first();
      if (existingProject) {
        res.status(400).json({ error: 'Project code already exists' });
        return;
      }

      const [project] = await db('projects')
        .insert({
          name,
          code,
          client,
          manager_id: managerId || null,
          allocated_hours: allocatedHours || null,
          budget_amount: budgetAmount || null,
          type,
          status: status || 'planning',
          description: description || null,
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'project',
        entityId: project.id,
        newValues: { name, code, type },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(project);
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
projectRoutes.put(
  '/:id',
  authorize('admin', 'supervisor'),
  [
    body('name').optional().notEmpty(),
    body('code').optional().notEmpty(),
    body('client').optional().notEmpty(),
    body('type').optional().isIn(['FIXED', 'OPEN', 'HYBRID']),
    body('status').optional().isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const existingProject = await db('projects').where({ id }).first();

      if (!existingProject) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const {
        name,
        code,
        client,
        managerId,
        allocatedHours,
        budgetAmount,
        type,
        status,
        description,
        startDate,
        endDate,
      } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (code) updateData.code = code;
      if (client) updateData.client = client;
      if (managerId !== undefined) updateData.manager_id = managerId;
      if (allocatedHours !== undefined) updateData.allocated_hours = allocatedHours;
      if (budgetAmount !== undefined) updateData.budget_amount = budgetAmount;
      if (type) updateData.type = type;
      if (status) updateData.status = status;
      if (description !== undefined) updateData.description = description;
      if (startDate !== undefined) updateData.start_date = startDate;
      if (endDate !== undefined) updateData.end_date = endDate;

      const [updatedProject] = await db('projects')
        .where({ id })
        .update(updateData)
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'update',
        entityType: 'project',
        entityId: parseInt(id),
        oldValues: existingProject,
        newValues: updateData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(updatedProject);
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
projectRoutes.delete('/:id', authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await db('projects').where({ id }).first();
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if project has time entries or tasks
    const hasTimeEntries = await db('time_entries').where({ project_id: id }).first();
    const hasTasks = await db('tasks').where({ project_id: id }).first();

    if (hasTimeEntries || hasTasks) {
      res.status(400).json({
        error: 'Cannot delete project with associated time entries or tasks. Please remove them first.',
      });
      return;
    }

    await db('projects').where({ id }).delete();

    await createAuditLog({
      userId: req.user!.id,
      action: 'delete',
      entityType: 'project',
      entityId: parseInt(id),
      oldValues: project,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

