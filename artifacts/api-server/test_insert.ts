import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    // Parameters from the screenshot
    const params = {
      id: undefined, // autoincrement
      categoryId: 2,
      categoryName: "Condensers",
      applicationCategory: "Car",
      productType: "Condenser",
      brandName: "Tata",
      kcplCode: "KCPL-R-1001",
      modelName: "test",
      size: "420mm",
      adaptablePartNo: "AP-001",
      imageUrl: "/uploads/1773745355543-759970552.png",
      specifications: null
    };

    console.log("Attempting manual insert...");
    
    // Explicit raw query to catch the exact MySQL error
    await db.execute(sql`
      insert into products (
        category_id, category_name, application_category, product_type, 
        brand_name, kcpl_code, model_name, size, adaptable_part_no, 
        image_url, specifications, created_at, updated_at
      ) values (
        ${params.categoryId}, ${params.categoryName}, ${params.applicationCategory}, ${params.productType}, 
        ${params.brandName}, ${params.kcplCode}, ${params.modelName}, ${params.size}, ${params.adaptablePartNo}, 
        ${params.imageUrl}, ${params.specifications}, NOW(), NOW()
      )
    `);
    
    console.log("Success!");
  } catch (err: any) {
    console.error("FAILED INSERT:");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    if (err.sqlMessage) console.error("SQL Message:", err.sqlMessage);
  }
  process.exit();
}
run();
