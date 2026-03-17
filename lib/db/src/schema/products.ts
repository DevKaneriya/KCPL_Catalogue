import { mysqlTable, int, text, timestamp, json, longtext, varchar, index } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const productsTable = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  categoryId: int("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  categoryName: varchar("category_name", { length: 255 }),
  applicationCategory: varchar("application_category", { length: 255 }),
  productType: varchar("product_type", { length: 255 }),
  brandName: varchar("brand_name", { length: 255 }),
  kcplCode: varchar("kcpl_code", { length: 255 }).unique(),
  modelName: varchar("model_name", { length: 255 }),
  size: varchar("size", { length: 255 }),
  adaptablePartNo: varchar("adaptable_part_no", { length: 255 }),
  imageUrl: longtext("image_url"),
  specifications: json("specifications"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  kcplCodeIdx: index("kcpl_code_idx").on(table.kcplCode),
}));

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
