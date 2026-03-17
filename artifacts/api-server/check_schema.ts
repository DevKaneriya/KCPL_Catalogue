import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const result = await db.execute(sql`DESCRIBE products`);
    console.log("Table structure:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("Error describing table:", err);
  }
  process.exit();
}
run();
