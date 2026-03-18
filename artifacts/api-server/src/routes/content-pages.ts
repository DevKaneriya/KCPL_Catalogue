import { Router, type IRouter } from "express";
import { db, contentPagesTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

router.get("/content-pages", async (_req, res) => {
  try {
    const pages = await db.select().from(contentPagesTable);
    pages.sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || (Number(a.id || 0) - Number(b.id || 0)));
    res.json(pages);
  } catch (err: any) {
    console.error("ERROR: Content pages list failed:", err);
    res.status(500).json({ error: err.message || "Failed to load content pages" });
  }
});

router.get("/content-pages/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [page] = await db.select().from(contentPagesTable).where(eq(contentPagesTable.id, id));
  if (!page) { res.status(404).json({ error: "Not found" }); return; }
  res.json(page);
});

router.post("/content-pages", async (req, res) => {
  try {
    const { title, content, imageUrl, sortOrder, type, category, slug } = req.body;
    if (!title) { res.status(400).json({ error: "Title is required" }); return; }
    const numericSortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
    
    let finalContent = content;
    let finalImageUrl = imageUrl;
    
    if (type === "custom") {
      finalContent = null;
      finalImageUrl = null;
    }

    await db.insert(contentPagesTable).values({ 
      title, 
      slug: slug || null,
      content: finalContent, 
      imageUrl: finalImageUrl, 
      sortOrder: numericSortOrder,
      type: type || "editor",
      category: category || "all"
    });

    // No guaranteed insertId shape for all drivers; fetch the most recent page instead
    const pages = await db.select().from(contentPagesTable).orderBy(desc(contentPagesTable.id)).limit(1 as any);
    const page = pages[0];
    if (!page) { res.status(500).json({ error: "Content page created but could not be retrieved" }); return; }

    await logActivity({ action: "Created", entityType: "ContentPage", entityId: page.id, details: `Content page "${title}" created` });
    res.status(201).json(page);
  } catch (err: any) {
    console.error("ERROR: Content page creation failed:", err);
    res.status(500).json({ error: err.message || "Failed to create content page" });
  }
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
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid content page id" }); return; }
  const { title, content, imageUrl, sortOrder, type, category, slug } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (title !== undefined) updates.title = title;
  if (slug !== undefined) updates.slug = slug;
  if (sortOrder !== undefined) updates.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
  if (type !== undefined) updates.type = type;
  if (category !== undefined) updates.category = category;

  if (type === "custom" || updates.type === "custom") {
    // If setting to custom, or it's currently custom in the request type update
    updates.content = null;
    updates.imageUrl = null;
  } else {
    if (content !== undefined) updates.content = content;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  }

  await db.update(contentPagesTable).set(updates).where(eq(contentPagesTable.id, id));
  const [page] = await db.select().from(contentPagesTable).where(eq(contentPagesTable.id, id));
  if (!page) { res.status(404).json({ error: "Not found" }); return; }
  await logActivity({ action: "Updated", entityType: "ContentPage", entityId: id, details: `Content page "${title}" updated` });
  res.json(page);
});

router.delete("/content-pages/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid content page id" }); return; }
  try {
    const [page] = await db.select().from(contentPagesTable).where(eq(contentPagesTable.id, id));
    if (!page) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(contentPagesTable).where(eq(contentPagesTable.id, id));
    await logActivity({ action: "Deleted", entityType: "ContentPage", entityId: id, details: `Content page "${page.title}" deleted` });
    res.status(204).send();
  } catch (err: any) {
    console.error("ERROR: Content page delete failed:", err);
    res.status(500).json({ error: err.message || "Failed to delete content page" });
  }
});

export default router;
