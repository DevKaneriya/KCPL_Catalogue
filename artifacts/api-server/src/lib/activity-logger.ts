import { db, activityLogsTable } from "@workspace/db";

interface LogParams {
  user?: string;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
}

export async function logActivity(params: LogParams) {
  try {
    await db.insert(activityLogsTable).values({
      user: params.user ?? "Admin",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      // Some existing DBs have missing/defaultless created_at; set explicitly to keep logs ordered correctly.
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
