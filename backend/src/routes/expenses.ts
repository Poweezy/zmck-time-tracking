import { Router, Response } from 'express';
import { body, query, validationResult, param } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

export const expenseRoutes = Router();
expenseRoutes.use(authenticate);

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'expenses');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `expense-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  },
});

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 */
expenseRoutes.get(
  '/',
  [
    query('projectId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }),
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'changes_requested']),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('page').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }),
    query('limit').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1 && num <= 100;
    }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { projectId, status, from, to, page, limit } = req.query;
      const pageNum = parseInt((page as string) || '1', 10);
      const limitNum = parseInt((limit as string) || '20', 10);

      let query = db('expenses')
        .leftJoin('users', 'expenses.user_id', 'users.id')
        .leftJoin('projects', 'expenses.project_id', 'projects.id')
        .leftJoin('tasks', 'expenses.task_id', 'tasks.id')
        .leftJoin('users as approver', 'expenses.approved_by', 'approver.id')
        .select(
          'expenses.*',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"),
          'projects.name as project_name',
          'projects.code as project_code',
          'tasks.title as task_title',
          db.raw("CONCAT(approver.first_name, ' ', approver.last_name) as approver_name")
        );

      // Engineers can only see their own expenses
      if (req.user!.role === 'engineer') {
        query = query.where('expenses.user_id', req.user!.id);
      } else if (projectId) {
        query = query.where('expenses.project_id', projectId as string);
      }

      if (status) {
        query = query.where('expenses.approval_status', status as string);
      }

      if (from) {
        query = query.where('expenses.expense_date', '>=', from as string);
      }

      if (to) {
        query = query.where('expenses.expense_date', '<=', to as string);
      }

      // Get total count
      const countQuery = db('expenses').count('* as count').first();
      if (req.user!.role === 'engineer') {
        countQuery.where('user_id', req.user!.id);
      }
      const totalResult = await countQuery;
      const total = parseInt(totalResult?.count as string || '0', 10);

      // Apply pagination
      const offset = (pageNum - 1) * limitNum;
      const expenses = await query
        .orderBy('expenses.expense_date', 'desc')
        .orderBy('expenses.created_at', 'desc')
        .limit(limitNum)
        .offset(offset);

      res.json({
        data: expenses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      });
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses', details: error.message });
    }
  }
);

/**
 * @swagger
 * /expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 */
expenseRoutes.post(
  '/',
  upload.single('receipt'),
  [
    body('projectId').isInt().withMessage('Project ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('category').isString().isLength({ min: 1, max: 100 }).withMessage('Category is required'),
    body('expenseDate').isISO8601().withMessage('Valid expense date is required'),
    body('description').optional().isString().isLength({ max: 500 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { projectId, taskId, amount, category, description, expenseDate } = req.body;
      const receiptPath = req.file ? req.file.path : null;

      // Verify project exists
      const project = await db('projects').where({ id: projectId }).first();
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const [expense] = await db('expenses')
        .insert({
          user_id: req.user!.id,
          project_id: projectId,
          task_id: taskId || null,
          amount: parseFloat(amount),
          category,
          description: description || null,
          expense_date: expenseDate,
          receipt_file_path: receiptPath,
          approval_status: 'pending',
        })
        .returning('*');

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'expense',
        entityId: expense.id,
        details: { projectId, amount, category },
      });

      res.status(201).json(expense);
    } catch (error: any) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense', details: error.message });
    }
  }
);

/**
 * @swagger
 * /expenses/:id/approve:
 *   put:
 *     summary: Approve an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 */
expenseRoutes.put(
  '/:id/approve',
  [param('id').isInt(), authorize('admin', 'supervisor')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const expense = await db('expenses').where({ id }).first();
      if (!expense) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }

      await db('expenses')
        .where({ id })
        .update({
          approval_status: 'approved',
          approved_by: req.user!.id,
          approved_at: new Date(),
        });

      await createAuditLog({
        userId: req.user!.id,
        action: 'approve',
        entityType: 'expense',
        entityId: parseInt(id),
      });

      // Send email notification
      const user = await db('users').where({ id: expense.user_id }).first();
      if (user && user.email) {
        const { emailService } = await import('../utils/emailService');
        await emailService.sendExpenseApproved(
          user.email,
          `${user.first_name} ${user.last_name}`,
          expense.amount,
          expense.category
        );
      }

      res.json({ message: 'Expense approved' });
    } catch (error: any) {
      console.error('Error approving expense:', error);
      res.status(500).json({ error: 'Failed to approve expense', details: error.message });
    }
  }
);

/**
 * @swagger
 * /expenses/:id/reject:
 *   put:
 *     summary: Reject an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 */
expenseRoutes.put(
  '/:id/reject',
  [
    param('id').isInt(),
    body('rejectionReason').isString().isLength({ min: 1 }).withMessage('Rejection reason is required'),
    authorize('admin', 'supervisor'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { id } = req.params;
      const { rejectionReason } = req.body;

      const expense = await db('expenses').where({ id }).first();
      if (!expense) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }

      await db('expenses')
        .where({ id })
        .update({
          approval_status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: req.user!.id,
          approved_at: new Date(),
        });

      await createAuditLog({
        userId: req.user!.id,
        action: 'reject',
        entityType: 'expense',
        entityId: parseInt(id),
        details: { rejectionReason },
      });

      res.json({ message: 'Expense rejected' });
    } catch (error: any) {
      console.error('Error rejecting expense:', error);
      res.status(500).json({ error: 'Failed to reject expense', details: error.message });
    }
  }
);

/**
 * @swagger
 * /expenses/:id:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 */
expenseRoutes.delete(
  '/:id',
  [param('id').isInt()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const expense = await db('expenses').where({ id }).first();
      if (!expense) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }

      // Engineers can only delete their own pending expenses
      if (req.user!.role === 'engineer' && expense.user_id !== req.user!.id) {
        res.status(403).json({ error: 'You can only delete your own expenses' });
        return;
      }

      if (req.user!.role === 'engineer' && expense.approval_status !== 'pending') {
        res.status(403).json({ error: 'You can only delete pending expenses' });
        return;
      }

      // Delete receipt file if exists
      if (expense.receipt_file_path) {
        try {
          await fs.unlink(expense.receipt_file_path);
        } catch (fileError) {
          console.error('Error deleting receipt file:', fileError);
        }
      }

      await db('expenses').where({ id }).delete();

      await createAuditLog({
        userId: req.user!.id,
        action: 'delete',
        entityType: 'expense',
        entityId: parseInt(id),
      });

      res.json({ message: 'Expense deleted' });
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ error: 'Failed to delete expense', details: error.message });
    }
  }
);

