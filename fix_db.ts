
import { db } from "./lib/db/src/index.js";
import { sql } from "drizzle-orm";

async function fixTable() {
  console.log("Altering products table...");
  try {
    await db.execute(sql`ALTER TABLE products MODIFY category_id INT NULL`);
    await db.execute(sql`ALTER TABLE products MODIFY category_name VARCHAR(255) NULL`);
    console.log("Success!");
  } catch (err) {
    console.error("Failed:", err);
  }
  process.exit(0);
}

fixTable().catch(console.error);
