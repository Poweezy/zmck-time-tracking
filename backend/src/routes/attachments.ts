import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const attachmentRoutes = Router();

attachmentRoutes.use(authenticate);

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../data/uploads');
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/acad',
  'application/x-dwg',
  'application/x-dxf',
];

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const entityType = req.body.entityType;
    const entityDir = path.join(uploadDir, entityType || 'general');
    await fs.mkdir(entityDir, { recursive: true });
    cb(null, entityDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
});

/**
 * @swagger
 * /attachments:
 *   post:
 *     summary: Upload attachment
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 */
attachmentRoutes.post(
  '/',
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { entityType, entityId } = req.body;

      if (!entityType || !entityId) {
        // Delete uploaded file if validation fails
        await fs.unlink(req.file.path);
        res.status(400).json({ error: 'entityType and entityId are required' });
        return;
      }

      const [attachment] = await db('attachments')
        .insert({
          filename: req.file.filename,
          original_filename: req.file.originalname,
          file_path: req.file.path,
          mime_type: req.file.mimetype,
          file_size: req.file.size,
          entity_type: entityType,
          entity_id: parseInt(entityId),
          uploaded_by: req.user!.id,
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'upload',
        entityType: 'attachment',
        entityId: attachment.id,
        newValues: { filename: req.file.originalname, entityType, entityId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        id: attachment.id,
        filename: attachment.original_filename,
        mimeType: attachment.mime_type,
        fileSize: attachment.file_size,
        uploadedAt: attachment.created_at,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /attachments:
 *   get:
 *     summary: Get attachments
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 */
attachmentRoutes.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.query;

    let query = db('attachments')
      .leftJoin('users', 'attachments.uploaded_by', 'users.id')
      .select(
        'attachments.*',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as uploaded_by_name")
      );

    if (entityType && entityId) {
      query = query
        .where('attachments.entity_type', entityType as string)
        .where('attachments.entity_id', entityId as string);
    }

    const attachments = await query.orderBy('attachments.created_at', 'desc');

    res.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /attachments/{id}:
 *   get:
 *     summary: Download attachment
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 */
attachmentRoutes.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await db('attachments').where({ id }).first();

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    // Check if file exists
    try {
      await fs.access(attachment.file_path);
    } catch {
      res.status(404).json({ error: 'File not found on disk' });
      return;
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.original_filename}"`
    );

    const fileContent = await fs.readFile(attachment.file_path);
    res.send(fileContent);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /attachments/{id}:
 *   delete:
 *     summary: Delete attachment
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 */
attachmentRoutes.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await db('attachments').where({ id }).first();

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    // Only allow deletion by uploader or admin/supervisor
    if (
      attachment.uploaded_by !== req.user!.id &&
      req.user!.role !== 'admin' &&
      req.user!.role !== 'supervisor'
    ) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Delete file from disk
    try {
      await fs.unlink(attachment.file_path);
    } catch (error) {
      console.error('File deletion error:', error);
    }

    await db('attachments').where({ id }).delete();

    await createAuditLog({
      userId: req.user!.id,
      action: 'delete',
      entityType: 'attachment',
      entityId: parseInt(id),
      oldValues: attachment,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

