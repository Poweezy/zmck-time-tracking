import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { db } from '../db';
import { AuthRequest, authorize } from '../middleware/auth';

const customFieldRoutes = Router();

/**
 * @swagger
 * /custom-fields:
 *   get:
 *     summary: Get all custom fields
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 */
customFieldRoutes.get(
  '/',
  [query('entityType').optional().isIn(['project', 'task'])],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { entityType } = req.query;
      let query = db('custom_fields').where('is_active', true);

      if (entityType) {
        query = query.where('entity_type', entityType as string);
      }

      const fields = await query.orderBy('created_at', 'desc');
      res.json(fields);
    } catch (error) {
      console.error('Get custom fields error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /custom-fields:
 *   post:
 *     summary: Create custom field
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 */
customFieldRoutes.post(
  '/',
  authorize('admin', 'supervisor'),
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('type').isIn(['text', 'number', 'date', 'dropdown', 'multi_select', 'checkbox']),
    body('entityType').isIn(['project', 'task']),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i),
    body('options').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, type, entityType, color, options } = req.body;

      const [field] = await db('custom_fields')
        .insert({
          name,
          type,
          entity_type: entityType,
          color: color || '#6366f1',
          options: options ? JSON.stringify(options) : null,
          created_by: req.user!.id,
        })
        .returning('*');

      res.status(201).json(field);
    } catch (error) {
      console.error('Create custom field error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /custom-fields/{id}/values:
 *   post:
 *     summary: Set custom field value for entity
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 */
customFieldRoutes.post(
  '/:id/values',
  [
    body('entityType').isIn(['project', 'task']),
    body('entityId').isInt(),
    body('value').notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { entityType, entityId, value } = req.body;

      const field = await db('custom_fields').where({ id }).first();
      if (!field) {
        res.status(404).json({ error: 'Custom field not found' });
        return;
      }

      // Validate value based on field type
      if (field.type === 'number' && isNaN(Number(value))) {
        res.status(400).json({ error: 'Invalid number value' });
        return;
      }

      if (field.type === 'date' && isNaN(Date.parse(value))) {
        res.status(400).json({ error: 'Invalid date value' });
        return;
      }

      if ((field.type === 'dropdown' || field.type === 'multi_select') && field.options) {
        const options = JSON.parse(field.options);
        const values = Array.isArray(value) ? value : [value];
        const invalid = values.filter((v) => !options.includes(v));
        if (invalid.length > 0) {
          res.status(400).json({ error: `Invalid option(s): ${invalid.join(', ')}` });
          return;
        }
      }

      const [fieldValue] = await db('custom_field_values')
        .insert({
          custom_field_id: parseInt(id),
          entity_type: entityType,
          entity_id: entityId,
          value: Array.isArray(value) ? JSON.stringify(value) : value,
        })
        .onConflict(['custom_field_id', 'entity_type', 'entity_id'])
        .merge()
        .returning('*');

      res.json(fieldValue);
    } catch (error) {
      console.error('Set custom field value error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /custom-fields/values:
 *   get:
 *     summary: Get custom field values for entity
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 */
customFieldRoutes.get(
  '/values',
  [
    query('entityType').isIn(['project', 'task']),
    query('entityId').isInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { entityType, entityId } = req.query;

      const values = await db('custom_field_values')
        .join('custom_fields', 'custom_field_values.custom_field_id', 'custom_fields.id')
        .where({
          'custom_field_values.entity_type': entityType,
          'custom_field_values.entity_id': entityId,
          'custom_fields.is_active': true,
        })
        .select(
          'custom_field_values.*',
          'custom_fields.name',
          'custom_fields.type',
          'custom_fields.color',
          'custom_fields.options'
        );

      // Parse values based on type
      const parsedValues = values.map((v) => ({
        ...v,
        value: v.type === 'multi_select' ? JSON.parse(v.value || '[]') : v.value,
        options: v.options ? JSON.parse(v.options) : null,
      }));

      res.json(parsedValues);
    } catch (error) {
      console.error('Get custom field values error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default customFieldRoutes;

