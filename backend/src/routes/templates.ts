import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db';
import { AuthRequest, authorize } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

const templateRoutes = Router();

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: Get all project templates
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 */
templateRoutes.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const templates = await db('project_templates')
      .leftJoin('users', 'project_templates.created_by', 'users.id')
      .where('project_templates.is_active', true)
      .select(
        'project_templates.*',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
      )
      .orderBy('project_templates.created_at', 'desc');

    // Get tasks for each template
    const templatesWithTasks = await Promise.all(
      templates.map(async (template: any) => {
        const tasks = await db('template_tasks')
          .where('template_id', template.id)
          .orderBy('order', 'asc');
        return { ...template, tasks, default_fields: template.default_fields ? JSON.parse(template.default_fields) : null };
      })
    );

    res.json(templatesWithTasks);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /templates:
 *   post:
 *     summary: Create project template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 */
templateRoutes.post(
  '/',
  authorize('admin', 'supervisor'),
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['FIXED', 'OPEN', 'HYBRID']),
    body('tasks').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, description, codePrefix, type, defaultFields, tasks } = req.body;

      const [template] = await db('project_templates')
        .insert({
          name,
          description: description || null,
          code_prefix: codePrefix || null,
          type,
          default_fields: defaultFields ? JSON.stringify(defaultFields) : null,
          created_by: req.user!.id,
        })
        .returning('*');

      // Create template tasks if provided
      if (tasks && Array.isArray(tasks)) {
        const templateTasks = tasks.map((task: any, index: number) => ({
          template_id: template.id,
          title: task.title,
          description: task.description || null,
          order: task.order || index,
          estimated_hours: task.estimatedHours || null,
          priority: task.priority || 0,
          default_status: task.defaultStatus || 'todo',
        }));

        await db('template_tasks').insert(templateTasks);
      }

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'template',
        entityId: template.id,
        newValues: { name, type },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(template);
    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /templates/{id}/create-project:
 *   post:
 *     summary: Create project from template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 */
templateRoutes.post(
  '/:id/create-project',
  [
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty(),
    body('client').trim().notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { name, code, client, managerId, startDate, endDate } = req.body;

      const template = await db('project_templates').where({ id }).first();
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      const defaultFields = template.default_fields ? JSON.parse(template.default_fields) : {};

      // Create project
      const [project] = await db('projects')
        .insert({
          name,
          code,
          client,
          manager_id: managerId || null,
          type: template.type,
          allocated_hours: defaultFields.allocatedHours || null,
          budget_amount: defaultFields.budgetAmount || null,
          start_date: startDate || null,
          end_date: endDate || null,
          status: 'planning',
        })
        .returning('*');

      // Create tasks from template
      const templateTasks = await db('template_tasks').where('template_id', id).orderBy('order', 'asc');
      
      if (templateTasks.length > 0) {
        const tasks = templateTasks.map((templateTask: any) => ({
          project_id: project.id,
          title: templateTask.title,
          description: templateTask.description,
          estimated_hours: templateTask.estimated_hours,
          priority: templateTask.priority,
          status: templateTask.default_status,
        }));

        await db('tasks').insert(tasks);
      }

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'project',
        entityId: project.id,
        newValues: { name, code, fromTemplate: template.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(project);
    } catch (error) {
      console.error('Create project from template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default templateRoutes;

