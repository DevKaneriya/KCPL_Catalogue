import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";
import { authenticate, requirePermission } from "../middleware/auth";

const router: IRouter = Router();

router.get("/categories", authenticate, async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.id);
  const withCounts = await Promise.all(cats.map(async (cat) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(productsTable).where(eq(productsTable.categoryId, cat.id));
    return { ...cat, productCount: count };
  }));
  res.json(withCounts);
});

router.get("/categories/:id", authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(productsTable).where(eq(productsTable.categoryId, id));
  res.json({ ...cat, productCount: count });
});

router.post("/categories", authenticate, requirePermission("categories:write"), async (req, res) => {
  try {
    let { name, description, slug, fieldSchema } = req.body;
    if (!name) { res.status(400).json({ error: "Name is required" }); return; }

    // Ensure slug exists (DB requires not null and unique)
    if (!slug) {
      slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    if (typeof fieldSchema === "string") {
      try {
        fieldSchema = JSON.parse(fieldSchema);
      } catch {
        fieldSchema = null;
      }
    }

    await db.insert(categoriesTable).values({ name, description, slug, fieldSchema });

    // Retrieve by slug (unique)
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug));
    if (!cat) { res.status(500).json({ error: "Category created but could not be retrieved" }); return; }

    await logActivity({ action: "Created", entityType: "Category", entityId: cat.id, details: `Category "${name}" created` });
    res.status(201).json({ ...cat, productCount: 0 });
  } catch (err: any) {
    console.error("ERROR: Category creation failed:", err);
    res.status(500).json({ error: err.message || "Failed to create category" });
  }
});

router.put("/categories/:id", authenticate, requirePermission("categories:write"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid category id" }); return; }
  try {
    let { name, description, slug, fieldSchema } = req.body;
    if (typeof fieldSchema === "string") {
      try {
        fieldSchema = JSON.parse(fieldSchema);
      } catch {
        fieldSchema = null;
      }
    }
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (slug !== undefined) updates.slug = slug;
    if (fieldSchema !== undefined) updates.fieldSchema = fieldSchema;
    await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id));
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    if (!cat) { res.status(404).json({ error: "Not found" }); return; }
    await logActivity({ action: "Updated", entityType: "Category", entityId: cat.id, details: `Category "${name}" updated` });
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(productsTable).where(eq(productsTable.categoryId, id));
    res.json({ ...cat, productCount: count });
  } catch (err: any) {
    console.error("ERROR: Category update failed:", err);
    res.status(500).json({ error: err.message || "Failed to update category" });
  }
});

router.delete("/categories/:id", authenticate, requirePermission("categories:write"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid category id" }); return; }
  try {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    if (!cat) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    await logActivity({ action: "Deleted", entityType: "Category", entityId: id, details: `Category "${cat.name}" deleted` });
    res.status(204).send();
  } catch (err: any) {
    console.error("ERROR: Category delete failed:", err);
    res.status(500).json({ error: err.message || "Failed to delete category" });
  }
});

export default router;
