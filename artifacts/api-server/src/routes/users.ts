import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users", async (_req, res) => {
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, roleId: usersTable.roleId, roleName: rolesTable.name, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .orderBy(usersTable.id);
  res.json(users);
});

router.post("/users", async (req, res) => {
  const { username, email, password, roleId } = req.body;
  if (!username || !password) { res.status(400).json({ error: "Username and password required" }); return; }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ username, email, passwordHash, roleId: roleId || null, isActive: true }).returning();
  res.status(201).json({ ...user, passwordHash: undefined, roleName: null });
});

router.put("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { username, email, password, roleId, isActive } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);
  if (roleId !== undefined) updates.roleId = roleId || null;
  if (isActive !== undefined) updates.isActive = isActive;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  let roleName = null;
  if (user.roleId) {
    const [r] = await db.select({ name: rolesTable.name }).from(rolesTable).where(eq(rolesTable.id, user.roleId));
    roleName = r?.name;
  }
  res.json({ ...user, passwordHash: undefined, roleName });
});

router.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

export default router;
