import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-session-secret-change-me";

if (SESSION_SECRET === "dev-session-secret-change-me") {
  console.warn("WARNING: Using default session secret. Set SESSION_SECRET in .env to persist sessions across restarts and improve security.");
}

type SessionPayload = { userId: number; iat: number };

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(payloadB64: string): string {
  return base64UrlEncode(crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest());
}

function createToken(userId: number): string {
  const payload: SessionPayload = { userId, iat: Date.now() };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function getSession(token: string): { userId: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
    if (!payload?.userId || !payload?.iat) return null;
    if (Date.now() - payload.iat > SESSION_TTL_MS) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
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

  if (!user || !Boolean(user.isActive)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  let roleName: string | null = null;
  let permissions: string[] = [];
  if (user.roleId) {
    const [role] = await db.select({ 
      name: rolesTable.name,
      permissions: rolesTable.permissions 
    }).from(rolesTable).where(eq(rolesTable.id, user.roleId));
    
    if (role) {
      roleName = role.name;
      const raw = role.permissions;
      if (Array.isArray(raw)) {
        permissions = raw;
      } else if (typeof raw === 'string') {
        try {
          permissions = JSON.parse(raw);
          if (typeof permissions === 'string') permissions = JSON.parse(permissions);
        } catch (e) { permissions = []; }
      }
    }
  }

  const token = createToken(user.id);

  res.json({
    token,
    user: { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      roleId: user.roleId, 
      roleName, 
      permissions: Array.isArray(permissions) ? permissions : [],
      isActive: Boolean(user.isActive), 
      createdAt: user.createdAt 
    },
  });
});

router.post("/auth/logout", (req, res) => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const session = getSession(token);
  if (!session) { res.status(401).json({ error: "Session expired" }); return; }

  const [result] = await db
    .select({ 
      id: usersTable.id, 
      username: usersTable.username, 
      email: usersTable.email, 
      roleId: usersTable.roleId, 
      roleName: rolesTable.name,
      permissions: rolesTable.permissions,
      isActive: usersTable.isActive, 
      createdAt: usersTable.createdAt 
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(eq(usersTable.id, session.userId));

  if (!result) { res.status(401).json({ error: "User not found" }); return; }

  let permissions: string[] = [];
  const raw = result.permissions;

  if (Array.isArray(raw)) {
    permissions = raw;
  } else if (typeof raw === 'string' && raw.trim().length > 0) {
    try {
      let parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (Array.isArray(parsed)) {
        permissions = parsed;
      }
    } catch (e: any) {
      permissions = [];
    }
  }

  const finalUser = {
    id: result.id,
    username: result.username,
    email: result.email,
    roleId: result.roleId,
    roleName: result.roleName,
    permissions: Array.isArray(permissions) ? permissions : [],
    isActive: Boolean(result.isActive),
    createdAt: result.createdAt
  };

  console.log(`[AUTH DEBUG] Returning final user with ${finalUser.permissions.length} permissions`);
  res.json(finalUser);
});

export default router;

// Token refresh endpoint: exchanges a valid token for a fresh token (extends TTL)
router.post("/auth/refresh", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const session = getSession(token);
  if (!session) { res.status(401).json({ error: "Session expired" }); return; }

  // Create a new token with fresh iat
  const newToken = createToken(session.userId);
  // Return only the new token; frontend may call /auth/me to get user data if needed
  res.json({ token: newToken });
});
