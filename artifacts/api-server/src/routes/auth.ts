import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const sessions = new Map<string, { userId: number; username: string }>();

export function getSession(token: string) {
  return sessions.get(token);
}

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, passwordHash: usersTable.passwordHash, roleId: usersTable.roleId, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  let roleName: string | null = null;
  if (user.roleId) {
    const [role] = await db.select({ name: rolesTable.name }).from(rolesTable).where(eq(rolesTable.id, user.roleId));
    roleName = role?.name ?? null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, username: user.username });

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, roleId: user.roleId, roleName, isActive: user.isActive, createdAt: user.createdAt },
  });
});

router.post("/auth/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) sessions.delete(token);
  res.json({ success: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const session = sessions.get(token);
  if (!session) { res.status(401).json({ error: "Session expired" }); return; }

  const [user] = await db
    .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, roleId: usersTable.roleId, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  let roleName: string | null = null;
  if (user.roleId) {
    const [role] = await db.select({ name: rolesTable.name }).from(rolesTable).where(eq(rolesTable.id, user.roleId));
    roleName = role?.name ?? null;
  }

  res.json({ ...user, roleName });
});

export default router;
