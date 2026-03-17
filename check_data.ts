
import { db, productsTable, productTypesTable } from "./lib/db/src/index.js";

async function check() {
  const masterTypes = await db.select({name: productTypesTable.name}).from(productTypesTable);
  const existingTypes = await db.selectDistinct({type: productsTable.productType}).from(productsTable);
  
  console.log("Master Product Types:");
  console.log(masterTypes.map(t => t.name));
  
  console.log("\nProducts in DB have these types:");
  console.log(existingTypes.map(t => t.type));
  
  process.exit(0);
}

check().catch(console.error);
