import { Router, type IRouter } from "express";
import { db, contentPagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.get("/content-pages", async (_req, res) => {
  const pages = await db.select().from(contentPagesTable).orderBy(asc(contentPagesTable.sortOrder), asc(contentPagesTable.id));
  res.json(pages);
});

router.get("/content-pages/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [page] = await db.select().from(contentPagesTable).where(eq(contentPagesTable.id, id));
  if (!page) { res.status(404).json({ error: "Not found" }); return; }
  res.json(page);
});

router.post("/content-pages", async (req, res) => {
  const { title, content, imageUrl, sortOrder } = req.body;
  const [page] = await db.insert(contentPagesTable).values({ title, content, imageUrl, sortOrder: sortOrder ?? 0 }).returning();
  await logActivity({ action: "Created", entityType: "ContentPage", entityId: page.id, details: `Content page "${title}" created` });
  res.status(201).json(page);
});

router.put("/content-pages/reorder", async (req, res) => {
  const { ids } = req.body as { ids: number[] };
  await Promise.all(ids.map((id, idx) =>
    db.update(contentPagesTable).set({ sortOrder: idx, updatedAt: new Date() }).where(eq(contentPagesTable.id, id))
  ));
  await logActivity({ action: "Reordered", entityType: "ContentPage", entityId: 0, details: "Content pages reordered" });
  res.json({ success: true });
});

router.put("/content-pages/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, content, imageUrl, sortOrder } = req.body;
  const [page] = await db.update(contentPagesTable).set({ title, content, imageUrl, sortOrder, updatedAt: new Date() }).where(eq(contentPagesTable.id, id)).returning();
  if (!page) { res.status(404).json({ error: "Not found" }); return; }
  await logActivity({ action: "Updated", entityType: "ContentPage", entityId: id, details: `Content page "${title}" updated` });
  res.json(page);
});

router.delete("/content-pages/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [page] = await db.select().from(contentPagesTable).where(eq(contentPagesTable.id, id));
  if (!page) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(contentPagesTable).where(eq(contentPagesTable.id, id));
  await logActivity({ action: "Deleted", entityType: "ContentPage", entityId: id, details: `Content page "${page.title}" deleted` });
  res.status(204).send();
});

export default router;
