import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const [rows] = await db.execute(sql`SELECT id, name FROM categories WHERE id = 2`) as any;
    console.log("Category 2 check:", rows);
  } catch (err: any) {
    console.error("Error checking category:", err);
  }
  process.exit();
}
run();
