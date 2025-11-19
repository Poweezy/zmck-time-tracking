import { db } from '../db';
import { emailService } from './emailService';

/**
 * Check for upcoming milestones and send reminder emails
 * Should be run daily via cron job or scheduled task
 * 
 * Usage: tsx src/utils/milestoneReminderService.ts
 */
export async function checkAndSendMilestoneReminders(): Promise<void> {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    // Find milestones due in the next 3 days that are not completed
    const upcomingMilestones = await db('milestones')
      .leftJoin('projects', 'milestones.project_id', 'projects.id')
      .leftJoin('users', 'milestones.created_by', 'users.id')
      .where('milestones.status', '!=', 'completed')
      .where('milestones.target_date', '>=', today.toISOString().split('T')[0])
      .where('milestones.target_date', '<=', threeDaysFromNow.toISOString().split('T')[0])
      .select(
        'milestones.*',
        'projects.name as project_name',
        'users.email as creator_email',
        'users.first_name',
        'users.last_name'
      );

    for (const milestone of upcomingMilestones) {
      if (milestone.creator_email) {
        await emailService.sendMilestoneReminder(
          milestone.creator_email,
          `${milestone.first_name} ${milestone.last_name}`,
          milestone.name,
          milestone.project_name,
          new Date(milestone.target_date).toLocaleDateString()
        );
      }
    }

    console.log(`Sent ${upcomingMilestones.length} milestone reminder emails`);
  } catch (error) {
    console.error('Error sending milestone reminders:', error);
  }
}

// Allow running directly: tsx milestoneReminderService.ts
if (require.main === module) {
  checkAndSendMilestoneReminders()
    .then(() => {
      console.log('Milestone reminder check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

