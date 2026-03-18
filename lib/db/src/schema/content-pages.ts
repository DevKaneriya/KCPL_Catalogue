import { mysqlTable, int, text, timestamp, longtext, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentPagesTable = mysqlTable("content_pages", {
  id: int("id").primaryKey().autoincrement(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }),
  content: longtext("content"),
  imageUrl: longtext("image_url"),
  type: varchar("type", { length: 50 }).notNull().default("editor"),
  category: varchar("category", { length: 255 }).notNull().default("all"),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const insertContentPageSchema = createInsertSchema(contentPagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentPage = z.infer<typeof insertContentPageSchema>;
export type ContentPage = typeof contentPagesTable.$inferSelect;
