import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const code = "KCPL-R-1001";
    const [rows] = await db.execute(sql`SELECT id, kcpl_code FROM products WHERE kcpl_code = ${code}`) as any;
    console.log(`Checking for existing product with code ${code}:`, rows);
  } catch (err: any) {
    console.error("Error checking product:", err);
  }
  process.exit();
}
run();
