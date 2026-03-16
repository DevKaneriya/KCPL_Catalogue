import { mysqlTable, int, text, timestamp, json, longtext } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const productsTable = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  categoryId: int("category_id").references(() => categoriesTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name"),
  skuCode: text("sku_code"),
  kcplCode: text("kcpl_code"),
  vehicleBrand: text("vehicle_brand"),
  engineBrand: text("engine_brand"),
  productType: text("product_type"),
  size: text("size"),
  imageUrl: longtext("image_url"),
  specifications: json("specifications"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
