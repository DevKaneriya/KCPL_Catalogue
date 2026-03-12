import { Router, type IRouter } from "express";
import { db, rolesTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/roles", async (_req, res) => {
  const roles = await db.select().from(rolesTable).orderBy(rolesTable.id);
  const withCounts = await Promise.all(roles.map(async (role) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.roleId, role.id));
    return { ...role, userCount: count };
  }));
  res.json(withCounts);
});

router.post("/roles", async (req, res) => {
  const { name, description, permissions } = req.body;
  const [role] = await db.insert(rolesTable).values({ name, description, permissions: permissions || [] }).returning();
  res.status(201).json({ ...role, userCount: 0 });
});

router.put("/roles/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, permissions } = req.body;
  const [role] = await db.update(rolesTable).set({ name, description, permissions: permissions || [], updatedAt: new Date() }).where(eq(rolesTable.id, id)).returning();
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.roleId, id));
  res.json({ ...role, userCount: count });
});

router.delete("/roles/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(rolesTable).where(eq(rolesTable.id, id));
  res.status(204).send();
});

export default router;
