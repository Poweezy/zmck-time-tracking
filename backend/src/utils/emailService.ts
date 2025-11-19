import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialize transporter if email is configured
    if (this.isEmailConfigured()) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  }

  private isEmailConfigured(): boolean {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    );
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email not configured. Skipping email send.');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // Email Templates
  async sendTimeEntryApproved(userEmail: string, userName: string, hours: number, projectName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Time Entry Approved ✅</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Your time entry has been approved:</p>
              <ul>
                <li><strong>Hours:</strong> ${hours.toFixed(2)}h</li>
                <li><strong>Project:</strong> ${projectName}</li>
              </ul>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/time-tracking" class="button">View Time Entries</a>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `Time Entry Approved - ${projectName}`,
      html,
    });
  }

  async sendTimeEntryRejected(userEmail: string, userName: string, projectName: string, reason: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .reason { background: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Time Entry Rejected ❌</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Your time entry for <strong>${projectName}</strong> has been rejected.</p>
              <div class="reason">
                <strong>Reason:</strong> ${reason}
              </div>
              <p>Please review and resubmit your time entry.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/time-tracking" class="button">View Time Entries</a>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `Time Entry Rejected - ${projectName}`,
      html,
    });
  }

  async sendExpenseApproved(userEmail: string, userName: string, amount: number, category: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Expense Approved ✅</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Your expense has been approved:</p>
              <ul>
                <li><strong>Amount:</strong> E${amount.toFixed(2)}</li>
                <li><strong>Category:</strong> ${category}</li>
              </ul>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/expenses" class="button">View Expenses</a>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `Expense Approved - ${category}`,
      html,
    });
  }

  async sendInvoiceSent(clientEmail: string, clientName: string, invoiceNumber: string, amount: number, dueDate: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .invoice-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Invoice ${invoiceNumber}</h2>
            </div>
            <div class="content">
              <p>Hello ${clientName},</p>
              <p>Please find attached invoice for your review.</p>
              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount Due:</strong> E${amount.toFixed(2)}</p>
                <p><strong>Due Date:</strong> ${dueDate}</p>
              </div>
              <p>Thank you for your business!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: `Invoice ${invoiceNumber} - Payment Due`,
      html,
    });
  }

  async sendMilestoneReminder(userEmail: string, userName: string, milestoneName: string, projectName: string, targetDate: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Milestone Reminder ⏰</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>This is a reminder about an upcoming milestone:</p>
              <ul>
                <li><strong>Milestone:</strong> ${milestoneName}</li>
                <li><strong>Project:</strong> ${projectName}</li>
                <li><strong>Target Date:</strong> ${targetDate}</li>
              </ul>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects" class="button">View Project</a>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `Milestone Reminder: ${milestoneName}`,
      html,
    });
  }

  async sendTaskAssigned(userEmail: string, userName: string, taskTitle: string, projectName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Task Assigned 📋</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>You have been assigned a new task:</p>
              <ul>
                <li><strong>Task:</strong> ${taskTitle}</li>
                <li><strong>Project:</strong> ${projectName}</li>
              </ul>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks" class="button">View Task</a>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `New Task: ${taskTitle}`,
      html,
    });
  }
}

export const emailService = new EmailService();

