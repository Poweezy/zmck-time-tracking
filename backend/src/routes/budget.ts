import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const budgetRoutes = Router();
budgetRoutes.use(authenticate);
budgetRoutes.use(authorize('admin', 'supervisor'));

/**
 * @swagger
 * /budget/project/:projectId:
 *   get:
 *     summary: Get budget vs actual for a project
 *     tags: [Budget]
 *     security:
 *       - bearerAuth: []
 */
budgetRoutes.get(
  '/project/:projectId',
  [
    query('projectId').custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Get project with budget
      const project = await db('projects').where({ id: projectId }).first();
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Calculate actual costs from time entries
      const timeEntries = await db('time_entries')
        .leftJoin('users', 'time_entries.user_id', 'users.id')
        .where('time_entries.project_id', projectId)
        .where('time_entries.approval_status', 'approved')
        .select(
          'time_entries.duration_hours',
          'users.hourly_rate'
        );

      let actualCost = 0;
      let actualHours = 0;
      for (const entry of timeEntries) {
        const hours = parseFloat(entry.duration_hours || 0);
        const rate = parseFloat(entry.hourly_rate || 0);
        actualCost += hours * rate;
        actualHours += hours;
      }

      // Calculate actual costs from expenses
      const expenses = await db('expenses')
        .where('project_id', projectId)
        .where('approval_status', 'approved')
        .sum('amount as total');

      const expenseTotal = parseFloat(expenses[0]?.total || 0);
      actualCost += expenseTotal;

      const budgetAmount = parseFloat(project.budget_amount || 0);
      const allocatedHours = parseFloat(project.allocated_hours || 0);

      const costVariance = actualCost - budgetAmount;
      const hoursVariance = actualHours - allocatedHours;
      const costVariancePercent = budgetAmount > 0 ? (costVariance / budgetAmount) * 100 : 0;
      const hoursVariancePercent = allocatedHours > 0 ? (hoursVariance / allocatedHours) * 100 : 0;

      res.json({
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
          budget_amount: budgetAmount,
          allocated_hours: allocatedHours,
        },
        actual: {
          cost: parseFloat(actualCost.toFixed(2)),
          hours: parseFloat(actualHours.toFixed(2)),
        },
        variance: {
          cost: parseFloat(costVariance.toFixed(2)),
          hours: parseFloat(hoursVariance.toFixed(2)),
          costPercent: parseFloat(costVariancePercent.toFixed(2)),
          hoursPercent: parseFloat(hoursVariancePercent.toFixed(2)),
        },
        breakdown: {
          timeCost: parseFloat((actualCost - expenseTotal).toFixed(2)),
          expenseCost: parseFloat(expenseTotal.toFixed(2)),
        },
      });
    } catch (error: any) {
      console.error('Error fetching budget data:', error);
      res.status(500).json({ error: 'Failed to fetch budget data', details: error.message });
    }
  }
);

/**
 * @swagger
 * /budget/all:
 *   get:
 *     summary: Get budget vs actual for all projects
 *     tags: [Budget]
 *     security:
 *       - bearerAuth: []
 */
budgetRoutes.get(
  '/all',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projects = await db('projects')
        .whereNotNull('budget_amount')
        .orWhereNotNull('allocated_hours')
        .select('id', 'name', 'code', 'budget_amount', 'allocated_hours', 'status');

      const budgetData = await Promise.all(
        projects.map(async (project) => {
          // Calculate actual costs from time entries
          const timeEntries = await db('time_entries')
            .leftJoin('users', 'time_entries.user_id', 'users.id')
            .where('time_entries.project_id', project.id)
            .where('time_entries.approval_status', 'approved')
            .select('time_entries.duration_hours', 'users.hourly_rate');

          let actualCost = 0;
          let actualHours = 0;
          for (const entry of timeEntries) {
            const hours = parseFloat(entry.duration_hours || 0);
            const rate = parseFloat(entry.hourly_rate || 0);
            actualCost += hours * rate;
            actualHours += hours;
          }

          // Calculate actual costs from expenses
          const expenses = await db('expenses')
            .where('project_id', project.id)
            .where('approval_status', 'approved')
            .sum('amount as total');

          const expenseTotal = parseFloat(expenses[0]?.total || 0);
          actualCost += expenseTotal;

          const budgetAmount = parseFloat(project.budget_amount || 0);
          const allocatedHours = parseFloat(project.allocated_hours || 0);

          const costVariance = actualCost - budgetAmount;
          const hoursVariance = actualHours - allocatedHours;
          const costVariancePercent = budgetAmount > 0 ? (costVariance / budgetAmount) * 100 : 0;
          const hoursVariancePercent = allocatedHours > 0 ? (hoursVariance / allocatedHours) * 100 : 0;

          return {
            project: {
              id: project.id,
              name: project.name,
              code: project.code,
              status: project.status,
            },
            budget: {
              amount: budgetAmount,
              hours: allocatedHours,
            },
            actual: {
              cost: parseFloat(actualCost.toFixed(2)),
              hours: parseFloat(actualHours.toFixed(2)),
            },
            variance: {
              cost: parseFloat(costVariance.toFixed(2)),
              hours: parseFloat(hoursVariance.toFixed(2)),
              costPercent: parseFloat(costVariancePercent.toFixed(2)),
              hoursPercent: parseFloat(hoursVariancePercent.toFixed(2)),
            },
          };
        })
      );

      res.json(budgetData);
    } catch (error: any) {
      console.error('Error fetching budget data:', error);
      res.status(500).json({ error: 'Failed to fetch budget data', details: error.message });
    }
  }
);

