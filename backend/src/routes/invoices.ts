import { Router, Response } from 'express';
import { body, query, validationResult, param } from 'express-validator';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLogger';

export const invoiceRoutes = Router();
invoiceRoutes.use(authenticate);
invoiceRoutes.use(authorize('admin', 'supervisor'));

/**
 * Generate unique invoice number
 */
const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const lastInvoice = await db('invoices')
    .where('invoice_number', 'like', `${prefix}%`)
    .orderBy('invoice_number', 'desc')
    .first();

  if (lastInvoice) {
    const lastNum = parseInt(lastInvoice.invoice_number.split('-')[2] || '0', 10);
    return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
  }

  return `${prefix}0001`;
};

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Get all invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 */
invoiceRoutes.get(
  '/',
  [
    query('projectId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(String(value), 10);
      return !isNaN(num) && num >= 1;
    }),
    query('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { projectId, status } = req.query;

      let query = db('invoices')
        .leftJoin('projects', 'invoices.project_id', 'projects.id')
        .leftJoin('users', 'invoices.created_by', 'users.id')
        .select(
          'invoices.*',
          'projects.name as project_name',
          'projects.code as project_code',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
        );

      if (projectId) {
        query = query.where('invoices.project_id', projectId as string);
      }

      if (status) {
        query = query.where('invoices.status', status as string);
      }

      const invoices = await query.orderBy('invoices.invoice_date', 'desc');

      // Get invoice items for each invoice
      const invoicesWithItems = await Promise.all(
        invoices.map(async (invoice) => {
          const items = await db('invoice_items')
            .leftJoin('time_entries', 'invoice_items.time_entry_id', 'time_entries.id')
            .leftJoin('expenses', 'invoice_items.expense_id', 'expenses.id')
            .select('invoice_items.*')
            .where('invoice_items.invoice_id', invoice.id);

          return { ...invoice, items };
        })
      );

      res.json(invoicesWithItems);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
    }
  }
);

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create a new invoice from time entries and expenses
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 */
invoiceRoutes.post(
  '/',
  [
    body('projectId').isInt().withMessage('Project ID is required'),
    body('invoiceDate').isISO8601().withMessage('Valid invoice date is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('timeEntryIds').optional().isArray(),
    body('expenseIds').optional().isArray(),
    body('taxRate').optional().isFloat({ min: 0, max: 100 }),
    body('notes').optional().isString(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { projectId, invoiceDate, dueDate, timeEntryIds = [], expenseIds = [], taxRate = 0, notes } = req.body;

      // Verify project exists
      const project = await db('projects').where({ id: projectId }).first();
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (timeEntryIds.length === 0 && expenseIds.length === 0) {
        res.status(400).json({ error: 'At least one time entry or expense is required' });
        return;
      }

      const invoiceNumber = await generateInvoiceNumber();
      let subtotal = 0;
      const items: any[] = [];

      // Process time entries
      if (timeEntryIds.length > 0) {
        const timeEntries = await db('time_entries')
          .leftJoin('users', 'time_entries.user_id', 'users.id')
          .whereIn('time_entries.id', timeEntryIds)
          .where('time_entries.project_id', projectId)
          .where('time_entries.approval_status', 'approved')
          .select('time_entries.*', 'users.hourly_rate');

        for (const entry of timeEntries) {
          const rate = parseFloat(entry.hourly_rate || '0');
          const amount = entry.duration_hours * rate;
          subtotal += amount;

          items.push({
            description: `Time: ${entry.notes || 'Time entry'} (${entry.duration_hours.toFixed(2)}h @ ${rate.toFixed(2)}/hr)`,
            quantity: entry.duration_hours,
            unit_price: rate,
            amount,
            item_type: 'time',
            time_entry_id: entry.id,
          });
        }
      }

      // Process expenses
      if (expenseIds.length > 0) {
        const expenses = await db('expenses')
          .whereIn('id', expenseIds)
          .where('project_id', projectId)
          .where('approval_status', 'approved');

        for (const expense of expenses) {
          subtotal += parseFloat(expense.amount);

          items.push({
            description: `Expense: ${expense.category} - ${expense.description || 'No description'}`,
            quantity: 1,
            unit_price: expense.amount,
            amount: expense.amount,
            item_type: 'expense',
            expense_id: expense.id,
          });
        }
      }

      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      // Create invoice
      const [invoice] = await db('invoices')
        .insert({
          invoice_number: invoiceNumber,
          project_id: projectId,
          invoice_date: invoiceDate,
          due_date: dueDate,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'draft',
          notes: notes || null,
          created_by: req.user!.id,
        })
        .returning('*');

      // Create invoice items
      await db('invoice_items').insert(
        items.map((item) => ({
          ...item,
          invoice_id: invoice.id,
        }))
      );

      await createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'invoice',
        entityId: invoice.id,
        details: { invoiceNumber, projectId, totalAmount },
      });

      // Fetch invoice with items
      const invoiceWithItems = await db('invoices')
        .where({ id: invoice.id })
        .first();
      const invoiceItems = await db('invoice_items').where({ invoice_id: invoice.id });

      res.status(201).json({ ...invoiceWithItems, items: invoiceItems });
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice', details: error.message });
    }
  }
);

/**
 * @swagger
 * /invoices/:id/send:
 *   put:
 *     summary: Send an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 */
invoiceRoutes.put(
  '/:id/send',
  [param('id').isInt()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const invoice = await db('invoices').where({ id }).first();
      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      await db('invoices')
        .where({ id })
        .update({
          status: 'sent',
          sent_at: new Date(),
        });

      await createAuditLog({
        userId: req.user!.id,
        action: 'send',
        entityType: 'invoice',
        entityId: parseInt(id),
      });

      res.json({ message: 'Invoice sent' });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      res.status(500).json({ error: 'Failed to send invoice', details: error.message });
    }
  }
);

/**
 * @swagger
 * /invoices/:id/mark-paid:
 *   put:
 *     summary: Mark invoice as paid
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 */
invoiceRoutes.put(
  '/:id/mark-paid',
  [param('id').isInt()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const invoice = await db('invoices').where({ id }).first();
      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      await db('invoices')
        .where({ id })
        .update({
          status: 'paid',
          paid_at: new Date(),
        });

      await createAuditLog({
        userId: req.user!.id,
        action: 'mark_paid',
        entityType: 'invoice',
        entityId: parseInt(id),
      });

      res.json({ message: 'Invoice marked as paid' });
    } catch (error: any) {
      console.error('Error marking invoice as paid:', error);
      res.status(500).json({ error: 'Failed to mark invoice as paid', details: error.message });
    }
  }
);

/**
 * @swagger
 * /invoices/:id:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 */
invoiceRoutes.get(
  '/:id',
  [param('id').isInt()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const invoice = await db('invoices')
        .leftJoin('projects', 'invoices.project_id', 'projects.id')
        .leftJoin('users', 'invoices.created_by', 'users.id')
        .select(
          'invoices.*',
          'projects.name as project_name',
          'projects.code as project_code',
          db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
        )
        .where('invoices.id', id)
        .first();

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      const items = await db('invoice_items')
        .leftJoin('time_entries', 'invoice_items.time_entry_id', 'time_entries.id')
        .leftJoin('expenses', 'invoice_items.expense_id', 'expenses.id')
        .select('invoice_items.*')
        .where('invoice_items.invoice_id', id);

      res.json({ ...invoice, items });
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice', details: error.message });
    }
  }
);

