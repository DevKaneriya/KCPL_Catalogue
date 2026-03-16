import { Request, Response, NextFunction } from "express";
import { getSession } from "../routes/auth";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    roleId: number | null;
    roleName: string | null;
    permissions: string[];
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const session = getSession(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      roleId: usersTable.roleId,
      roleName: rolesTable.name,
      permissions: rolesTable.permissions,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(eq(usersTable.id, session.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  let permissions: string[] = [];
  const raw = user.permissions;
  if (Array.isArray(raw)) {
    permissions = raw;
  } else if (typeof raw === 'string') {
    try {
      permissions = JSON.parse(raw);
      if (typeof permissions === 'string') permissions = JSON.parse(permissions);
    } catch (e) { permissions = []; }
  }

  req.user = {
    ...user,
    roleId: user.roleId ?? null,
    roleName: user.roleName ?? null,
    permissions: Array.isArray(permissions) ? permissions : [],
  };

  console.log(`[AUTH MIDDLEWARE DEBUG] User: ${req.user.username}, Role: ${req.user.roleName}, Permissions:`, req.user.permissions);

  next();
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Admin has all permissions
    if (req.user.roleName?.toLowerCase() === "admin") {
      next();
      return;
    }

    if (req.user.permissions.includes(permission)) {
      next();
      return;
    }

    res.status(403).json({ error: "Permission denied" });
  };
};
