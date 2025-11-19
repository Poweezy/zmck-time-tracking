import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getCapacitySummary, getCapacityForecast } from '../services/capacityService';

export const capacityRoutes = Router();

capacityRoutes.use(authenticate);

const canViewAll = (req: AuthRequest) => req.user?.role === 'admin' || req.user?.role === 'supervisor';

const coerceBoolean = (value: string | string[] | undefined): boolean => {
  if (Array.isArray(value)) {
    return value.some((v) => ['true', '1', 'yes', 'on'].includes(v.toLowerCase()));
  }
  return value ? ['true', '1', 'yes', 'on'].includes(value.toLowerCase()) : false;
};

capacityRoutes.get(
  '/summary',
  [
    query('from').optional().isISO8601().withMessage('from must be a valid ISO8601 date'),
    query('to').optional().isISO8601().withMessage('to must be a valid ISO8601 date'),
    query('userId').optional().isInt({ min: 1 }).withMessage('userId must be a positive integer'),
    query('me').optional().isBoolean().withMessage('me must be a boolean'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const me = coerceBoolean(req.query.me as string | undefined);
    const requestedUserId = req.query.userId ? parseInt(String(req.query.userId), 10) : undefined;
    let effectiveUserId = requestedUserId;

    if (me) {
      effectiveUserId = req.user!.id;
    }

    if (!canViewAll(req)) {
      if (effectiveUserId && effectiveUserId !== req.user!.id) {
        res.status(403).json({ error: 'Insufficient permissions to view other users' });
        return;
      }
      effectiveUserId = req.user!.id;
    }

    try {
      const summary = await getCapacitySummary({
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        userId: effectiveUserId,
      });

      res.json(summary);
    } catch (error) {
      console.error('Capacity summary error:', error);
      res.status(500).json({ error: 'Failed to load capacity summary' });
    }
  }
);

capacityRoutes.get(
  '/forecast',
  [
    query('start').optional().isISO8601().withMessage('start must be a valid ISO8601 date'),
    query('weeks').optional().isInt({ min: 1, max: 8 }).withMessage('weeks must be between 1 and 8'),
    query('userId').optional().isInt({ min: 1 }).withMessage('userId must be a positive integer'),
    query('includeProjectMix').optional().isBoolean().withMessage('includeProjectMix must be a boolean'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const requestedUserId = req.query.userId ? parseInt(String(req.query.userId), 10) : undefined;
    let effectiveUserId = requestedUserId;

    if (!canViewAll(req)) {
      if (effectiveUserId && effectiveUserId !== req.user!.id) {
        res.status(403).json({ error: 'Insufficient permissions to view other users' });
        return;
      }
      effectiveUserId = req.user!.id;
    }

    try {
      const forecast = await getCapacityForecast({
        start: req.query.start as string | undefined,
        weeks: req.query.weeks ? parseInt(String(req.query.weeks), 10) : undefined,
        userId: effectiveUserId,
        includeProjectMix: coerceBoolean(req.query.includeProjectMix as string | undefined),
      });

      res.json(forecast);
    } catch (error) {
      console.error('Capacity forecast error:', error);
      res.status(500).json({ error: 'Failed to load capacity forecast' });
    }
  }
);


