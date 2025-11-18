import { db } from '../db';

export interface CreateNotificationParams {
  userId: number;
  type: string;
  title: string;
  message?: string;
  entityType?: 'project' | 'task' | 'time_entry' | 'user';
  entityId?: number;
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  try {
    await db('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notifications are non-critical
  }
};

export const createBulkNotifications = async (
  userIds: number[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> => {
  try {
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
    }));

    if (notifications.length > 0) {
      await db('notifications').insert(notifications);
    }
  } catch (error) {
    console.error('Failed to create bulk notifications:', error);
  }
};

