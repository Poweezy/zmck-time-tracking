import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { checkAndSendMilestoneReminders } from '../utils/milestoneReminderService';

export const emailRoutes = Router();
emailRoutes.use(authenticate);
emailRoutes.use(authorize('admin'));

/**
 * @swagger
 * /email/test:
 *   post:
 *     summary: Send a test email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 */
emailRoutes.post('/test', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    // Send a test email
    const { emailService } = await import('../utils/emailService');
    const sent = await emailService.sendEmail({
      to: email,
      subject: 'Test Email from ZMCK Time Tracking',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from the ZMCK Time Tracking system.</p>
        <p>If you received this, email notifications are configured correctly!</p>
      `,
    });

    if (sent) {
      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send test email. Check email configuration.' });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

/**
 * @swagger
 * /email/milestone-reminders:
 *   post:
 *     summary: Send milestone reminder emails (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 */
emailRoutes.post('/milestone-reminders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await checkAndSendMilestoneReminders();
    res.json({ message: 'Milestone reminders sent' });
  } catch (error: any) {
    console.error('Error sending milestone reminders:', error);
    res.status(500).json({ error: 'Failed to send milestone reminders', details: error.message });
  }
});

