import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.get("/categories", async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.id);
  const withCounts = await Promise.all(cats.map(async (cat) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, cat.id));
    return { ...cat, productCount: count };
  }));
  res.json(withCounts);
});

router.get("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, id));
  res.json({ ...cat, productCount: count });
});

router.post("/categories", async (req, res) => {
  const { name, description, slug, fieldSchema } = req.body;
  const [cat] = await db.insert(categoriesTable).values({ name, description, slug, fieldSchema }).returning();
  await logActivity({ action: "Created", entityType: "Category", entityId: cat.id, details: `Category "${name}" created` });
  res.status(201).json({ ...cat, productCount: 0 });
});

router.put("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, slug, fieldSchema } = req.body;
  const [cat] = await db.update(categoriesTable).set({ name, description, slug, fieldSchema, updatedAt: new Date() }).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  await logActivity({ action: "Updated", entityType: "Category", entityId: cat.id, details: `Category "${name}" updated` });
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, id));
  res.json({ ...cat, productCount: count });
});

router.delete("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  await logActivity({ action: "Deleted", entityType: "Category", entityId: id, details: `Category "${cat.name}" deleted` });
  res.status(204).send();
});

export default router;
