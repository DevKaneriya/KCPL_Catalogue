
import { db, productTypesTable } from "./lib/db/src/index.js";

async function check() {
  const types = await db.select().from(productTypesTable);
  console.log("Product Types from DB:");
  console.log(JSON.stringify(types, null, 2));
  process.exit(0);
}

check().catch(console.error);
