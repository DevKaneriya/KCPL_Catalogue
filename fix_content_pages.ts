import { db } from "./lib/db/src/index.ts";
import { sql } from "drizzle-orm";

async function fixTable() {
  console.log("Altering content_pages table...");
  try {
    try {
        await db.execute(sql`ALTER TABLE content_pages ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'editor'`);
    } catch (e) { console.error(e) }
    try {
        await db.execute(sql`ALTER TABLE content_pages ADD COLUMN category VARCHAR(255) NOT NULL DEFAULT 'all'`);
    } catch (e) { console.error(e) }
    console.log("Success!");
  } catch (err) {
    console.error("Failed:", err);
  }
  process.exit(0);
}

fixTable().catch(console.error);
