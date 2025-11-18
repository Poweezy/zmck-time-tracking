import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../db';
import { AuthRequest, authorize } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

const formRoutes = Router();

/**
 * @swagger
 * /forms:
 *   get:
 *     summary: Get all forms
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 */
formRoutes.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const forms = await db('forms')
      .leftJoin('users', 'forms.created_by', 'users.id')
      .where('forms.is_active', true)
      .select(
        'forms.*',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
      )
      .orderBy('forms.created_at', 'desc');

    const parsed = forms.map((form) => ({
      ...form,
      fields: form.fields ? JSON.parse(form.fields) : [],
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /forms:
 *   post:
 *     summary: Create form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 */
formRoutes.post(
  '/',
  authorize('admin', 'supervisor'),
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['work_request', 'project_intake']),
    body('fields').isArray(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, description, type, fields } = req.body;

      const [form] = await db('forms')
        .insert({
          name,
          description: description || null,
          type,
          fields: JSON.stringify(fields),
          created_by: req.user!.id,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'form',
        entityId: form.id,
        newValues: { name, type },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({ ...form, fields: JSON.parse(form.fields) });
    } catch (error) {
      console.error('Create form error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /forms/{id}/submit:
 *   post:
 *     summary: Submit form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 */
formRoutes.post(
  '/:id/submit',
  [body('data').isObject()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { data } = req.body;

      const form = await db('forms').where({ id }).first();
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      const [submission] = await db('form_submissions')
        .insert({
          form_id: parseInt(id),
          submitted_by: req.user!.id,
          data: JSON.stringify(data),
          status: 'pending',
        })
        .returning('*');

      res.status(201).json({ ...submission, data: JSON.parse(submission.data) });
    } catch (error) {
      console.error('Submit form error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /forms/submissions:
 *   get:
 *     summary: Get form submissions
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 */
formRoutes.get(
  '/submissions',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let query = db('form_submissions')
        .leftJoin('forms', 'form_submissions.form_id', 'forms.id')
        .leftJoin('users as submitter', 'form_submissions.submitted_by', 'submitter.id')
        .leftJoin('users as reviewer', 'form_submissions.reviewed_by', 'reviewer.id')
        .select(
          'form_submissions.*',
          'forms.name as form_name',
          'forms.type as form_type',
          db.raw("CONCAT(submitter.first_name, ' ', submitter.last_name) as submitted_by_name"),
          db.raw("CONCAT(reviewer.first_name, ' ', reviewer.last_name) as reviewed_by_name")
        );

      // Engineers can only see their own submissions
      if (req.user!.role === 'engineer') {
        query = query.where('form_submissions.submitted_by', req.user!.id);
      }

      const submissions = await query.orderBy('form_submissions.created_at', 'desc');

      const parsed = submissions.map((sub) => ({
        ...sub,
        data: sub.data ? JSON.parse(sub.data) : {},
      }));

      res.json(parsed);
    } catch (error) {
      console.error('Get form submissions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default formRoutes;

