import { mysqlTable, int, varchar, timestamp, unique } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productTypesTable = mysqlTable("product_types", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applicationCategoriesTable = mysqlTable("application_categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  productTypeId: int("product_type_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.name, table.productTypeId)
}));

export const brandsTable = mysqlTable("brands", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  productTypeId: int("product_type_id").notNull(),
  applicationCategoryId: int("application_category_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.name, table.productTypeId, table.applicationCategoryId)
}));

export const insertProductTypeSchema = createInsertSchema(productTypesTable).omit({ id: true, createdAt: true });
export type InsertProductType = z.infer<typeof insertProductTypeSchema>;
export type ProductType = typeof productTypesTable.$inferSelect;

export const insertAppCatSchema = createInsertSchema(applicationCategoriesTable).omit({ id: true, createdAt: true });
export type InsertAppCat = z.infer<typeof insertAppCatSchema>;
export type AppCat = typeof applicationCategoriesTable.$inferSelect;

export const insertBrandSchema = createInsertSchema(brandsTable).omit({ id: true, createdAt: true });
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brandsTable.$inferSelect;
