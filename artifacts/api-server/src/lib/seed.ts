import bcrypt from "bcryptjs";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export async function seedAdminUser() {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    if (count > 0) return;

    const [adminRole] = await db.select().from(rolesTable).where(eq(rolesTable.name, "Admin"));
    if (!adminRole) return;

    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.insert(usersTable).values({
      username: "admin",
      email: "admin@kcpl.com",
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    });
    console.log("✅ Default admin user created (username: admin, password: admin123)");
  } catch (err) {
    console.error("Failed to seed admin user:", err);
  }
}
