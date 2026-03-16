import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, requirePermission } from "../middleware/auth";

const router: IRouter = Router();

router.get("/users", authenticate, async (_req, res) => {
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, roleId: usersTable.roleId, roleName: rolesTable.name, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .orderBy(usersTable.id);
  res.json(users);
});

router.post("/users", authenticate, requirePermission("users:write"), async (req, res) => {
  try {
    const { username, email, password, roleId } = req.body;
    if (!username || !password) { res.status(400).json({ error: "Username and password required" }); return; }
    const roleIdValue = roleId !== undefined && roleId !== null ? Number(roleId) : null;
    const safeRoleId = Number.isFinite(roleIdValue) ? roleIdValue : null;
    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(usersTable).values({ 
      username, 
      email, 
      passwordHash, 
      roleId: safeRoleId, 
      isActive: true 
    });

    // Retrieve the created user by unique username (safer than relying on driver insert result shape)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (!user) { res.status(500).json({ error: "User created but could not be retrieved" }); return; }
    res.status(201).json({ ...user, passwordHash: undefined, roleName: null });
  } catch (err: any) {
    console.error("ERROR: User creation failed:", err);
    res.status(500).json({ error: err.message || "Failed to create user" });
  }
});

router.put("/users/:id", authenticate, requirePermission("users:write"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  try {
    const { username, email, password, roleId, isActive } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);
    if (roleId !== undefined) {
      const roleIdValue = roleId !== null ? Number(roleId) : null;
      updates.roleId = Number.isFinite(roleIdValue as number) ? roleIdValue : null;
    }
    if (isActive !== undefined) updates.isActive = isActive;
    
    await db.update(usersTable).set(updates).where(eq(usersTable.id, id));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    
    let roleName = null;
    if (user.roleId) {
      const [r] = await db.select({ name: rolesTable.name }).from(rolesTable).where(eq(rolesTable.id, user.roleId));
      roleName = r?.name;
    }
    res.json({ ...user, passwordHash: undefined, roleName });
  } catch (err: any) {
    console.error("ERROR: User update failed:", err);
    res.status(500).json({ error: err.message || "Failed to update user" });
  }
});

router.delete("/users/:id", authenticate, requirePermission("users:write"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  try {
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).send();
  } catch (err: any) {
    console.error("ERROR: User delete failed:", err);
    res.status(500).json({ error: err.message || "Failed to delete user" });
  }
});

export default router;
