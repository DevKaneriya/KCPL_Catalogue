import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

import { db, productTypesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const name = "Condenser";
    console.log("trying insert", name);
    await db.insert(productTypesTable).values({ name }).onDuplicateKeyUpdate({ set: { name } });
    const type = await db.select().from(productTypesTable).where(eq(productTypesTable.name, name));
    console.log("Success:", type);
  } catch (err: any) {
    console.error("Error creating product type:", err);
  }
  process.exit();
}
run();
