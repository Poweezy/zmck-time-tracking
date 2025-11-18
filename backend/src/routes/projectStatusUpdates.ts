import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

const statusUpdateRoutes = Router();

/**
 * @swagger
 * /project-status-updates:
 *   post:
 *     summary: Create project status update
 *     tags: [Project Status Updates]
 *     security:
 *       - bearerAuth: []
 */
statusUpdateRoutes.post(
  '/',
  [
    body('projectId').isInt(),
    body('status').isIn(['on_track', 'at_risk', 'off_track', 'on_hold']),
    body('updateText').trim().notEmpty(),
    body('progressPercentage').optional().isFloat({ min: 0, max: 100 }),
    body('highlights').optional().isArray(),
    body('blockers').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { projectId, status, updateText, progressPercentage, highlights, blockers } = req.body;

      const project = await db('projects').where({ id: projectId }).first();
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const [update] = await db('project_status_updates')
        .insert({
          project_id: projectId,
          created_by: req.user!.id,
          status,
          update_text: updateText,
          progress_percentage: progressPercentage || null,
          highlights: highlights ? JSON.stringify(highlights) : null,
          blockers: blockers ? JSON.stringify(blockers) : null,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'project_status_update',
        entityId: update.id,
        newValues: { projectId, status },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(update);
    } catch (error) {
      console.error('Create status update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /project-status-updates/project/{projectId}:
 *   get:
 *     summary: Get project status updates
 *     tags: [Project Status Updates]
 *     security:
 *       - bearerAuth: []
 */
statusUpdateRoutes.get(
  '/project/:projectId',
  [param('projectId').isInt(), query('limit').optional().isInt({ min: 1, max: 50 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const updates = await db('project_status_updates')
        .leftJoin('users', 'project_status_updates.created_by', 'users.id')
        .where('project_status_updates.project_id', projectId)
        .select(
          'project_status_updates.*',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
        )
        .orderBy('project_status_updates.created_at', 'desc')
        .limit(limit);

      const parsed = updates.map((u: any) => ({
        ...u,
        highlights: u.highlights ? JSON.parse(u.highlights) : null,
        blockers: u.blockers ? JSON.parse(u.blockers) : null,
      }));

      res.json(parsed);
    } catch (error) {
      console.error('Get status updates error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default statusUpdateRoutes;

