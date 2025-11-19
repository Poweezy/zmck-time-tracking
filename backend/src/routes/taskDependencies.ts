import { Router, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import { db } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const taskDependencyRoutes = Router();
taskDependencyRoutes.use(authenticate);

/**
 * @swagger
 * /task-dependencies:
 *   get:
 *     summary: Get task dependencies
 *     tags: [Task Dependencies]
 *     security:
 *       - bearerAuth: []
 */
taskDependencyRoutes.get(
  '/',
  [
    param('taskId').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { taskId } = req.query;

      let query = db('task_dependencies')
        .leftJoin('tasks as task', 'task_dependencies.task_id', 'task.id')
        .leftJoin('tasks as depends_on', 'task_dependencies.depends_on_task_id', 'depends_on.id')
        .select(
          'task_dependencies.*',
          'task.title as task_title',
          'depends_on.title as depends_on_task_title'
        );

      if (taskId) {
        query = query.where('task_dependencies.task_id', taskId as string);
      }

      const dependencies = await query;
      res.json(dependencies);
    } catch (error: any) {
      console.error('Error fetching task dependencies:', error);
      res.status(500).json({ error: 'Failed to fetch task dependencies', details: error.message });
    }
  }
);

/**
 * @swagger
 * /task-dependencies:
 *   post:
 *     summary: Create a task dependency
 *     tags: [Task Dependencies]
 *     security:
 *       - bearerAuth: []
 */
taskDependencyRoutes.post(
  '/',
  [
    body('taskId').isInt().withMessage('Task ID is required'),
    body('dependsOnTaskId').isInt().withMessage('Depends on task ID is required'),
    body('dependencyType').optional().isIn(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { taskId, dependsOnTaskId, dependencyType = 'finish_to_start' } = req.body;

      // Prevent self-dependency
      if (taskId === dependsOnTaskId) {
        res.status(400).json({ error: 'A task cannot depend on itself' });
        return;
      }

      // Verify tasks exist
      const [task, dependsOnTask] = await Promise.all([
        db('tasks').where({ id: taskId }).first(),
        db('tasks').where({ id: dependsOnTaskId }).first(),
      ]);

      if (!task || !dependsOnTask) {
        res.status(404).json({ error: 'One or both tasks not found' });
        return;
      }

      // Check for circular dependencies
      const existingDependency = await db('task_dependencies')
        .where({ task_id: dependsOnTaskId, depends_on_task_id: taskId })
        .first();

      if (existingDependency) {
        res.status(400).json({ error: 'Circular dependency detected' });
        return;
      }

      const [dependency] = await db('task_dependencies')
        .insert({
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
          dependency_type: dependencyType,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'task_dependency',
        entityId: dependency.id,
        details: { taskId, dependsOnTaskId, dependencyType },
      });

      res.status(201).json(dependency);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        res.status(400).json({ error: 'Dependency already exists' });
        return;
      }
      console.error('Error creating task dependency:', error);
      res.status(500).json({ error: 'Failed to create task dependency', details: error.message });
    }
  }
);

/**
 * @swagger
 * /task-dependencies/:id:
 *   delete:
 *     summary: Delete a task dependency
 *     tags: [Task Dependencies]
 *     security:
 *       - bearerAuth: []
 */
taskDependencyRoutes.delete(
  '/:id',
  [param('id').isInt()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const dependency = await db('task_dependencies').where({ id }).first();
      if (!dependency) {
        res.status(404).json({ error: 'Dependency not found' });
        return;
      }

      await db('task_dependencies').where({ id }).delete();

      await createAuditLog({
        userId: req.user!.id,
        action: 'delete',
        entityType: 'task_dependency',
        entityId: parseInt(id),
      });

      res.json({ message: 'Dependency deleted' });
    } catch (error: any) {
      console.error('Error deleting task dependency:', error);
      res.status(500).json({ error: 'Failed to delete task dependency', details: error.message });
    }
  }
);

