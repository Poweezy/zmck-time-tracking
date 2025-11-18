import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const analyticsRoutes = Router();

analyticsRoutes.use(authenticate);
analyticsRoutes.use(authorize('admin', 'supervisor'));

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
analyticsRoutes.get(
  '/dashboard',
  [query('from').optional().isISO8601(), query('to').optional().isISO8601()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { from, to } = req.query;

      let dateFilter = {};
      if (from || to) {
        dateFilter = {
          ...(from && { '>=': from }),
          ...(to && { '<=': to }),
        };
      }

      // Total hours logged (approved)
      const totalHoursResult = await db('time_entries')
        .where('approval_status', 'approved')
        .modify((queryBuilder) => {
          if (from) queryBuilder.where('start_time', '>=', from);
          if (to) queryBuilder.where('start_time', '<=', to);
        })
        .sum('duration_hours as total_hours')
        .first();

      // Hours by project
      const hoursByProject = await db('time_entries')
        .leftJoin('projects', 'time_entries.project_id', 'projects.id')
        .where('time_entries.approval_status', 'approved')
        .modify((queryBuilder) => {
          if (from) queryBuilder.where('time_entries.start_time', '>=', from);
          if (to) queryBuilder.where('time_entries.start_time', '<=', to);
        })
        .select('projects.id', 'projects.name', 'projects.code')
        .sum('time_entries.duration_hours as hours')
        .groupBy('projects.id', 'projects.name', 'projects.code')
        .orderBy('hours', 'desc');

      // Hours by user
      const hoursByUser = await db('time_entries')
        .leftJoin('users', 'time_entries.user_id', 'users.id')
        .where('time_entries.approval_status', 'approved')
        .modify((queryBuilder) => {
          if (from) queryBuilder.where('time_entries.start_time', '>=', from);
          if (to) queryBuilder.where('time_entries.start_time', '<=', to);
        })
        .select(
          'users.id',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as name"),
          'users.email'
        )
        .sum('time_entries.duration_hours as hours')
        .groupBy('users.id', 'users.first_name', 'users.last_name', 'users.email')
        .orderBy('hours', 'desc');

      // Pending approvals count
      const pendingCount = await db('time_entries')
        .where('approval_status', 'pending')
        .count('* as count')
        .first();

      // Project progress (for FIXED projects)
      const projectProgress = await db('projects')
        .leftJoin('time_entries', 'projects.id', 'time_entries.project_id')
        .where('projects.type', 'FIXED')
        .where('projects.allocated_hours', '>', 0)
        .where('time_entries.approval_status', 'approved')
        .modify((queryBuilder) => {
          if (from) queryBuilder.where('time_entries.start_time', '>=', from);
          if (to) queryBuilder.where('time_entries.start_time', '<=', to);
        })
        .select(
          'projects.id',
          'projects.name',
          'projects.code',
          'projects.allocated_hours',
          db.raw('COALESCE(SUM(time_entries.duration_hours), 0) as logged_hours')
        )
        .groupBy('projects.id', 'projects.name', 'projects.code', 'projects.allocated_hours')
        .then((results) =>
          results.map((p: any) => ({
            ...p,
            progress_percentage:
              p.allocated_hours > 0
                ? Math.min(100, (parseFloat(p.logged_hours) / parseFloat(p.allocated_hours)) * 100)
                : 0,
            variance: parseFloat(p.logged_hours) - parseFloat(p.allocated_hours),
          }))
        );

      res.json({
        totalHours: parseFloat(totalHoursResult?.total_hours || '0'),
        hoursByProject,
        hoursByUser,
        pendingApprovals: parseInt(pendingCount?.count || '0'),
        projectProgress,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /analytics/user/{userId}:
 *   get:
 *     summary: Get user productivity analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
analyticsRoutes.get(
  '/user/:userId',
  [query('from').optional().isISO8601(), query('to').optional().isISO8601()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { from, to } = req.query;

      // Total hours
      const totalHoursResult = await db('time_entries')
        .where('user_id', userId)
        .where('approval_status', 'approved')
        .modify((queryBuilder) => {
          if (from) queryBuilder.where('start_time', '>=', from);
          if (to) queryBuilder.where('start_time', '<=', to);
        })
        .sum('duration_hours as total_hours')
        .first();

      // Hours by project
      const hoursByProject = await db('time_entries')
        .leftJoin('projects', 'time_entries.project_id', 'projects.id')
        .where('time_entries.user_id', userId)
        .where('time_entries.approval_status', 'approved')
        .modify((queryBuilder) => {
          if (from) queryBuilder.where('time_entries.start_time', '>=', from);
          if (to) queryBuilder.where('time_entries.start_time', '<=', to);
        })
        .select('projects.id', 'projects.name', 'projects.code')
        .sum('time_entries.duration_hours as hours')
        .groupBy('projects.id', 'projects.name', 'projects.code')
        .orderBy('hours', 'desc');

      // Task completion stats
      const taskStats = await db('tasks')
        .where('assigned_to', userId)
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Time variance (estimated vs actual)
      const timeVariance = await db('tasks')
        .leftJoin('time_entries', function () {
          this.on('tasks.id', '=', 'time_entries.task_id').andOn(
            'time_entries.approval_status',
            '=',
            db.raw("'approved'")
          );
        })
        .where('tasks.assigned_to', userId)
        .whereNotNull('tasks.estimated_hours')
        .modify((queryBuilder) => {
          if (from) queryBuilder.where('time_entries.start_time', '>=', from);
          if (to) queryBuilder.where('time_entries.start_time', '<=', to);
        })
        .select(
          'tasks.id',
          'tasks.title',
          'tasks.estimated_hours',
          db.raw('COALESCE(SUM(time_entries.duration_hours), 0) as actual_hours')
        )
        .groupBy('tasks.id', 'tasks.title', 'tasks.estimated_hours')
        .then((results) =>
          results.map((t: any) => ({
            taskId: t.id,
            taskTitle: t.title,
            estimatedHours: parseFloat(t.estimated_hours),
            actualHours: parseFloat(t.actual_hours),
            variance: parseFloat(t.actual_hours) - parseFloat(t.estimated_hours),
            variancePercentage:
              t.estimated_hours > 0
                ? ((parseFloat(t.actual_hours) - parseFloat(t.estimated_hours)) /
                    parseFloat(t.estimated_hours)) *
                  100
                : 0,
          }))
        );

      res.json({
        totalHours: parseFloat(totalHoursResult?.total_hours || '0'),
        hoursByProject,
        taskStats,
        timeVariance,
      });
    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

