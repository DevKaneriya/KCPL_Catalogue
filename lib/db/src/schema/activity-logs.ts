import { mysqlTable, int, text, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityLogsTable = mysqlTable("activity_logs", {
  id: int("id").primaryKey().autoincrement(),
  user: text("user").default("Admin").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: int("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
