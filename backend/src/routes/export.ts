import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createCsvWriter } from 'csv-writer';
import { createAuditLog } from '../utils/auditLogger';
import path from 'path';
import fs from 'fs/promises';

export const exportRoutes = Router();

exportRoutes.use(authenticate);
exportRoutes.use(authorize('admin', 'supervisor'));

/**
 * @swagger
 * /export/sage:
 *   get:
 *     summary: Export time entries to Sage ACCPAC CSV format
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
exportRoutes.get(
  '/sage',
  [
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('projectId').optional().isInt(),
    query('mappingId').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { from, to, projectId, mappingId } = req.query;

      // Get column mapping
      let mapping;
      if (mappingId) {
        mapping = await db('sage_csv_mappings').where({ id: mappingId }).first();
      } else {
        mapping = await db('sage_csv_mappings').where({ is_default: true }).first();
      }

      if (!mapping) {
        res.status(404).json({ error: 'No CSV mapping found' });
        return;
      }

      const columnMapping = mapping.column_mapping as Record<string, string>;

      // Get approved time entries
      let query = db('time_entries')
        .leftJoin('users', 'time_entries.user_id', 'users.id')
        .leftJoin('projects', 'time_entries.project_id', 'projects.id')
        .leftJoin('tasks', 'time_entries.task_id', 'tasks.id')
        .where('time_entries.approval_status', 'approved')
        .select(
          'time_entries.*',
          'users.id as user_id',
          'users.email as user_email',
          'projects.code as project_code',
          'projects.name as project_name',
          'tasks.id as task_id',
          'tasks.title as task_title',
          'users.hourly_rate'
        );

      if (from) {
        query = query.where('time_entries.start_time', '>=', from as string);
      }

      if (to) {
        query = query.where('time_entries.start_time', '<=', to as string);
      }

      if (projectId) {
        query = query.where('time_entries.project_id', projectId as string);
      }

      const entries = await query.orderBy('time_entries.start_time', 'asc');

      if (entries.length === 0) {
        res.status(404).json({ error: 'No approved time entries found for the specified criteria' });
        return;
      }

      // Prepare CSV data based on mapping
      const csvHeaders = Object.keys(columnMapping).map((header) => ({
        id: header,
        title: header,
      }));

      const csvData = entries.map((entry) => {
        const row: Record<string, any> = {};
        for (const [sageColumn, ourField] of Object.entries(columnMapping)) {
          let value: any;

          switch (ourField) {
            case 'user_id':
              value = entry.user_id;
              break;
            case 'project_code':
              value = entry.project_code;
              break;
            case 'task_id':
              value = entry.task_id || '';
              break;
            case 'start_time':
              value = new Date(entry.start_time).toISOString().split('T')[0]; // Date only
              break;
            case 'duration_hours':
              value = entry.duration_hours;
              break;
            case 'notes':
              value = entry.notes || '';
              break;
            case 'project_id':
              value = entry.project_id;
              break;
            case 'hourly_rate':
              value = entry.hourly_rate || 0;
              break;
            default:
              value = entry[ourField] || '';
          }

          row[sageColumn] = value;
        }
        return row;
      });

      // Generate CSV file
      const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../data/uploads');
      const exportDir = path.join(uploadDir, 'exports');
      await fs.mkdir(exportDir, { recursive: true });

      const filename = `sage_export_${Date.now()}.csv`;
      const filepath = path.join(exportDir, filename);

      const csvWriter = createCsvWriter({
        path: filepath,
        header: csvHeaders,
      });

      await csvWriter.writeRecords(csvData);

      await createAuditLog({
        userId: req.user!.id,
        action: 'export',
        entityType: 'sage_csv',
        newValues: { filename, entryCount: entries.length, from, to, projectId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Send file
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const fileContent = await fs.readFile(filepath);
      res.send(fileContent);

      // Clean up file after sending
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /export/sage/preview:
 *   get:
 *     summary: Preview Sage export data
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
exportRoutes.get(
  '/sage/preview',
  [
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('projectId').optional().isInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { from, to, projectId } = req.query;
      const limit = parseInt((req.query.limit as string) || '10');

      let query = db('time_entries')
        .leftJoin('users', 'time_entries.user_id', 'users.id')
        .leftJoin('projects', 'time_entries.project_id', 'projects.id')
        .leftJoin('tasks', 'time_entries.task_id', 'tasks.id')
        .where('time_entries.approval_status', 'approved')
        .select(
          'time_entries.id',
          'time_entries.start_time',
          'time_entries.duration_hours',
          'time_entries.notes',
          'users.id as user_id',
          'users.email as user_email',
          'projects.code as project_code',
          'projects.name as project_name',
          'tasks.id as task_id',
          'tasks.title as task_title',
          'users.hourly_rate'
        )
        .limit(limit);

      if (from) {
        query = query.where('time_entries.start_time', '>=', from as string);
      }

      if (to) {
        query = query.where('time_entries.start_time', '<=', to as string);
      }

      if (projectId) {
        query = query.where('time_entries.project_id', projectId as string);
      }

      const entries = await query.orderBy('time_entries.start_time', 'desc');

      res.json({
        count: entries.length,
        entries,
        filters: { from, to, projectId },
      });
    } catch (error) {
      console.error('Export preview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /export/mappings:
 *   get:
 *     summary: Get all Sage CSV mappings
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */
exportRoutes.get('/mappings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mappings = await db('sage_csv_mappings')
      .select('id', 'name', 'column_mapping', 'is_default', 'created_at', 'updated_at')
      .orderBy('is_default', 'desc')
      .orderBy('created_at', 'desc');

    res.json(mappings);
  } catch (error) {
    console.error('Get mappings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

