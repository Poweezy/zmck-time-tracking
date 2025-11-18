import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

const goalRoutes = Router();

/**
 * @swagger
 * /goals:
 *   get:
 *     summary: Get all goals
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 */
goalRoutes.get(
  '/',
  [query('type').optional().isIn(['company', 'team', 'individual'])],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { type } = req.query;
      let query = db('goals')
        .leftJoin('users as owner', 'goals.owner_id', 'owner.id')
        .select(
          'goals.*',
          db.raw("CONCAT(owner.first_name, ' ', owner.last_name) as owner_name")
        );

      if (type) {
        query = query.where('goals.type', type as string);
      }

      const goals = await query.orderBy('goals.created_at', 'desc');

      // Get projects for each goal
      const goalsWithProjects = await Promise.all(
        goals.map(async (goal) => {
          const projectIds = await db('goal_projects')
            .where('goal_id', goal.id)
            .pluck('project_id');
          return { ...goal, projectIds };
        })
      );

      res.json(goalsWithProjects);
    } catch (error) {
      console.error('Get goals error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /goals:
 *   post:
 *     summary: Create goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 */
goalRoutes.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['company', 'team', 'individual']),
    body('targetValue').optional().isFloat({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, description, type, parentGoalId, ownerId, startDate, endDate, targetValue, targetUnit } = req.body;

      const [goal] = await db('goals')
        .insert({
          name,
          description: description || null,
          type,
          parent_goal_id: parentGoalId || null,
          owner_id: ownerId || req.user!.id,
          start_date: startDate || null,
          end_date: endDate || null,
          target_value: targetValue || null,
          target_unit: targetUnit || null,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'goal',
        entityId: goal.id,
        newValues: { name, type },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(goal);
    } catch (error) {
      console.error('Create goal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /goals/{id}/link-project:
 *   post:
 *     summary: Link project to goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 */
goalRoutes.post(
  '/:id/link-project',
  [body('projectId').isInt()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { projectId } = req.body;

      const goal = await db('goals').where({ id }).first();
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      const project = await db('projects').where({ id: projectId }).first();
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      await db('goal_projects')
        .insert({
          goal_id: parseInt(id),
          project_id: projectId,
        })
        .onConflict(['goal_id', 'project_id'])
        .ignore();

      res.json({ success: true });
    } catch (error) {
      console.error('Link project to goal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default goalRoutes;

