import { Router, type IRouter } from "express";
import { db, rolesTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";
import { authenticate, requirePermission } from "../middleware/auth";

const router: IRouter = Router();

// Helper to parse permissions from DB
const parsePermissions = (perms: any): string[] => {
  if (!perms) return [];
  if (Array.isArray(perms)) return perms;
  if (typeof perms === 'string') {
    try {
      let parsed = JSON.parse(perms);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse permissions string:", perms);
      return [];
    }
  }
  return [];
};

// Normalize permissions coming from API input
const normalizePermissions = (perms: any): string[] => {
  if (!perms) return [];
  if (Array.isArray(perms)) return perms.filter((p) => typeof p === "string");
  if (typeof perms === "string") {
    try {
      const parsed = JSON.parse(perms);
      return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
    } catch (e) {
      console.error("Failed to parse permissions input:", perms);
      return [];
    }
  }
  return [];
};

router.get("/roles", authenticate, async (_req, res) => {
  const roles = await db.select().from(rolesTable).orderBy(rolesTable.id);
  const withCounts = await Promise.all(roles.map(async (role) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.roleId, role.id));
    return { 
      ...role, 
      permissions: parsePermissions(role.permissions),
      userCount: count 
    };
  }));
  res.json(withCounts);
});

router.post("/roles", authenticate, requirePermission("roles:write"), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) { res.status(400).json({ error: "Role name is required" }); return; }
    const normalizedPermissions = normalizePermissions(permissions);
    console.log(`[ROLES] Creating role ${name} with permissions:`, normalizedPermissions);

    await db.insert(rolesTable).values({ 
      name, 
      description, 
      permissions: normalizedPermissions 
    });

    // Retrieve the created role by unique name
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.name, name));
    if (!role) { res.status(500).json({ error: "Role created but could not be retrieved" }); return; }
    
    await logActivity({ 
      action: "Created", 
      entityType: "Role", 
      entityId: role.id, 
      details: `Role "${name}" created with ${normalizedPermissions.length} permissions` 
    });
    
    res.status(201).json({ 
      ...role, 
      permissions: parsePermissions(role.permissions),
      userCount: 0 
    });
  } catch (err: any) {
    console.error("ERROR: Role creation failed:", err);
    res.status(500).json({ error: err.message || "Failed to create role" });
  }
});

router.put("/roles/:id", authenticate, requirePermission("roles:write"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid role id" }); return; }
  try {
    const { name, description, permissions } = req.body;
    const normalizedPermissions = permissions !== undefined ? normalizePermissions(permissions) : undefined;
    console.log(`[ROLES] Updating role ${id} with permissions:`, normalizedPermissions);

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (normalizedPermissions !== undefined) updates.permissions = normalizedPermissions;

    await db.update(rolesTable).set(updates).where(eq(rolesTable.id, id));
    
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id));
    if (!role) { res.status(404).json({ error: "Not found" }); return; }
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.roleId, id));
    
    await logActivity({ 
      action: "Updated", 
      entityType: "Role", 
      entityId: id, 
      details: `Role "${role.name}" updated` 
    });
    
    res.json({ 
      ...role, 
      permissions: parsePermissions(role.permissions),
      userCount: count 
    });
  } catch (err: any) {
    console.error("ERROR: Role update failed:", err);
    res.status(500).json({ error: err.message || "Failed to update role" });
  }
});

router.delete("/roles/:id", authenticate, requirePermission("roles:write"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid role id" }); return; }
  try {
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id));
    if (!role) { res.status(404).json({ error: "Not found" }); return; }
    
    await db.delete(rolesTable).where(eq(rolesTable.id, id));
    
    await logActivity({ 
      action: "Deleted", 
      entityType: "Role", 
      entityId: id, 
      details: `Role "${role.name}" deleted` 
    });
    
    res.status(204).send();
  } catch (err: any) {
    console.error("ERROR: Role delete failed:", err);
    res.status(500).json({ error: err.message || "Failed to delete role" });
  }
});

export default router;
