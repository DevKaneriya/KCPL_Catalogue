import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const [rows] = await db.execute(sql`DESCRIBE products`) as any;
    console.log("Columns in 'products' table:");
    for (const row of rows) {
      console.log(`- ${row.Field}: ${row.Type} (${row.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    }
  } catch (err: any) {
    console.error("Error describing table:", err);
  }
  process.exit();
}
run();
