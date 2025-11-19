# Email Configuration Guide

This guide explains how to configure email notifications in the ZMCK Time Tracking application.

## Overview

The application can send email notifications for:
- ✅ Time entry approvals/rejections
- ✅ Expense approvals/rejections
- ✅ Invoice sent/paid notifications
- ✅ Task assignments
- ✅ Milestone reminders

## Configuration

### 1. Add Environment Variables

Add the following variables to your `.env` file:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=ZMCK Time Tracking <your-email@gmail.com>

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Default client email (for invoice notifications)
DEFAULT_CLIENT_EMAIL=client@example.com
```

### 2. Gmail Setup

If using Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `SMTP_PASSWORD`

### 3. Other Email Providers

#### Outlook/Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-password
```

## Testing Email Configuration

### Via API

1. Start the backend server
2. Login as admin
3. Send a test email:

```bash
curl -X POST http://localhost:3001/api/email/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Via Frontend (if admin panel added)

Navigate to Settings → Email Configuration → Send Test Email

## Email Templates

The application includes HTML email templates for:

1. **Time Entry Approved** - Sent when supervisor approves time entry
2. **Time Entry Rejected** - Sent when supervisor rejects time entry with reason
3. **Expense Approved** - Sent when expense is approved
4. **Invoice Sent** - Sent to client when invoice is sent
5. **Task Assigned** - Sent when user is assigned a new task
6. **Milestone Reminder** - Sent 3 days before milestone target date

## Automatic Notifications

### When Emails Are Sent

- **Time Entry Approved**: Automatically when supervisor approves
- **Time Entry Rejected**: Automatically when supervisor rejects (with reason)
- **Expense Approved**: Automatically when supervisor approves expense
- **Invoice Sent**: Automatically when invoice status changes to "sent"
- **Task Assigned**: Automatically when task is created or assigned to user
- **Milestone Reminders**: Via scheduled job (see below)

## Scheduled Reminders

### Milestone Reminders

Milestone reminders are sent 3 days before the target date. To set up automatic reminders:

#### Option 1: Cron Job (Linux/Mac)

Add to crontab:
```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/zmck-time-tracking/backend && npm run send-reminders
```

#### Option 2: Windows Task Scheduler

Create a scheduled task to run:
```powershell
cd C:\path\to\zmck-time-tracking\backend
npm run send-reminders
```

#### Option 3: Manual Trigger

Call the API endpoint:
```bash
POST /api/email/milestone-reminders
```

### Add Script to package.json

Add this script to `backend/package.json`:

```json
{
  "scripts": {
    "send-reminders": "tsx src/utils/milestoneReminderService.ts"
  }
}
```

## Troubleshooting

### Emails Not Sending

1. **Check Configuration**
   - Verify all SMTP variables are set in `.env`
   - Check SMTP credentials are correct
   - Ensure SMTP server is accessible

2. **Check Logs**
   - Look for email-related errors in backend logs
   - Check if "Email not configured" warnings appear

3. **Test Connection**
   - Use the test email endpoint
   - Try different SMTP settings

4. **Common Issues**
   - **Gmail**: Need App Password, not regular password
   - **Port 587**: Usually requires `SMTP_SECURE=false`
   - **Port 465**: Usually requires `SMTP_SECURE=true`
   - **Firewall**: Ensure SMTP port is not blocked

### Email Goes to Spam

1. **SPF Record**: Add SPF record to your domain DNS
2. **DKIM**: Set up DKIM signing
3. **From Address**: Use a verified email address
4. **Content**: Avoid spam trigger words

## Disabling Email Notifications

If you don't want to use email notifications:

1. Simply don't set the SMTP environment variables
2. The application will log warnings but continue to work
3. In-app notifications will still work

## Security Notes

- Never commit `.env` file with real credentials
- Use App Passwords instead of main passwords when possible
- Rotate SMTP passwords regularly
- Consider using a dedicated email service (SendGrid, Mailgun) for production

## Production Recommendations

1. **Use Dedicated Email Service**
   - SendGrid, Mailgun, or AWS SES
   - Better deliverability
   - Analytics and tracking

2. **Set Up SPF/DKIM**
   - Improves email deliverability
   - Reduces spam classification

3. **Monitor Email Delivery**
   - Track bounce rates
   - Monitor spam complaints
   - Set up alerts for failures

4. **Rate Limiting**
   - Implement rate limiting for email sending
   - Prevent abuse

---

*For questions or issues, refer to the main documentation or contact the development team.*

