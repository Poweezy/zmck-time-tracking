import { db } from '../db';

interface AuditLogData {
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (data: AuditLogData): Promise<void> => {
  try {
    await db('audit_logs').insert({
      user_id: data.userId,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      old_values: data.oldValues ? JSON.stringify(data.oldValues) : null,
      new_values: data.newValues ? JSON.stringify(data.newValues) : null,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

