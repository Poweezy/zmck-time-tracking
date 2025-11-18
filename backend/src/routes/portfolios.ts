import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

const portfolioRoutes = Router();

/**
 * @swagger
 * /portfolios:
 *   get:
 *     summary: Get all portfolios
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 */
portfolioRoutes.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const portfolios = await db('portfolios')
      .leftJoin('users as owner', 'portfolios.owner_id', 'owner.id')
      .where('portfolios.is_active', true)
      .select(
        'portfolios.*',
        db.raw("CONCAT(owner.first_name, ' ', owner.last_name) as owner_name")
      )
      .orderBy('portfolios.created_at', 'desc');

    // Get projects for each portfolio
    const portfoliosWithProjects = await Promise.all(
      portfolios.map(async (portfolio) => {
        const projects = await db('portfolio_projects')
          .join('projects', 'portfolio_projects.project_id', 'projects.id')
          .where('portfolio_projects.portfolio_id', portfolio.id)
          .select('projects.*');
        return { ...portfolio, projects };
      })
    );

    res.json(portfoliosWithProjects);
  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /portfolios:
 *   post:
 *     summary: Create portfolio
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 */
portfolioRoutes.post(
  '/',
  [body('name').trim().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, description, projectIds } = req.body;

      const [portfolio] = await db('portfolios')
        .insert({
          name,
          description: description || null,
          owner_id: req.user!.id,
        })
        .returning('*');

      // Link projects if provided
      if (projectIds && Array.isArray(projectIds)) {
        const portfolioProjects = projectIds.map((projectId: number) => ({
          portfolio_id: portfolio.id,
          project_id: projectId,
        }));
        await db('portfolio_projects').insert(portfolioProjects);
      }

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'portfolio',
        entityId: portfolio.id,
        newValues: { name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(portfolio);
    } catch (error) {
      console.error('Create portfolio error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /portfolios/{id}/add-project:
 *   post:
 *     summary: Add project to portfolio
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 */
portfolioRoutes.post(
  '/:id/add-project',
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

      await db('portfolio_projects')
        .insert({
          portfolio_id: parseInt(id),
          project_id: projectId,
        })
        .onConflict(['portfolio_id', 'project_id'])
        .ignore();

      res.json({ success: true });
    } catch (error) {
      console.error('Add project to portfolio error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default portfolioRoutes;

