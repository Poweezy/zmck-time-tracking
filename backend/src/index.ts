import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { projectRoutes } from './routes/projects';
import { taskRoutes } from './routes/tasks';
import { timeEntryRoutes } from './routes/timeEntries';
import { approvalRoutes } from './routes/approvals';
import { exportRoutes } from './routes/export';
import { analyticsRoutes } from './routes/analytics';
import { attachmentRoutes } from './routes/attachments';
import { auditRoutes } from './routes/audit';
import customFieldRoutes from './routes/customFields';
import notificationRoutes from './routes/notifications';
import statusUpdateRoutes from './routes/projectStatusUpdates';
import templateRoutes from './routes/templates';
import goalRoutes from './routes/goals';
import portfolioRoutes from './routes/portfolios';
import formRoutes from './routes/forms';
import { expenseRoutes } from './routes/expenses';
import { milestoneRoutes } from './routes/milestones';
import { taskDependencyRoutes } from './routes/taskDependencies';
import { invoiceRoutes } from './routes/invoices';
import { budgetRoutes } from './routes/budget';

// Load .env from backend directory or root
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config(); // Also try default location

const app = express();
const PORT = process.env.PORT || 3001;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZMCK Time Tracking API',
      version: '1.0.0',
      description: 'API documentation for ZMCK Engineering Time-Tracking & Project Performance System',
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/project-status-updates', statusUpdateRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/task-dependencies', taskDependencyRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/budget', budgetRoutes);

// 404 handler - must be before error handler
app.use((req, res, next) => {
  // Static files should be served by frontend dev server (port 3000)
  // or production build, not the backend API
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
    res.status(404).send('Static file not found. Please access the frontend at http://localhost:3000');
    return;
  }
  
  // Only return JSON for API routes
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API route not found' });
  } else {
    // For non-API routes, provide helpful message
    res.status(404).send(`Route not found. Please access the frontend at http://localhost:3000${req.path}`);
  }
});

// Error handling middleware - must be last and have 4 parameters
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
});

export default app;

