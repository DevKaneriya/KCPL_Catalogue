import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    // 1. Rename columns if they exist
    await conn.execute(`ALTER TABLE products CHANGE COLUMN name model_name varchar(255)`);
    await conn.execute(`ALTER TABLE products CHANGE COLUMN vehicle_brand brand_name varchar(255)`);
    
    // 2. Add new columns
    await conn.execute(`ALTER TABLE products ADD COLUMN category_name varchar(255) NOT NULL DEFAULT 'Unknown'`);
    await conn.execute(`ALTER TABLE products ADD COLUMN application_category varchar(255)`);
    await conn.execute(`ALTER TABLE products ADD COLUMN adaptable_part_no varchar(255)`);
    
    // 3. Drop unneeded columns
    await conn.execute(`ALTER TABLE products DROP COLUMN sku_code`);
    await conn.execute(`ALTER TABLE products DROP COLUMN engine_brand`);

    // 4. Update types if needed
    await conn.execute(`ALTER TABLE products MODIFY category_id int NOT NULL`);
    
    // 5. Populate category_name with actual names from categories
    await conn.execute(`
      UPDATE products p
      JOIN categories c ON p.category_id = c.id
      SET p.category_name = c.name
    `);

    // 6. Delete duplicate kcpl_code products before adding unique constraint, keep the newest one
    await conn.execute(`
      DELETE p1 FROM products p1
      INNER JOIN products p2 
      WHERE p1.id < p2.id AND p1.kcpl_code = p2.kcpl_code AND p1.kcpl_code IS NOT NULL
    `);

    // 7. Add constraints and indexes
    try {
      await conn.execute(`ALTER TABLE products ADD CONSTRAINT products_kcpl_code_unique UNIQUE (kcpl_code)`);
    } catch(e) { console.log('constraint might exist', e.message); }
    
    try {
      await conn.execute(`CREATE INDEX kcpl_code_idx ON products (kcpl_code)`);
    } catch(e) { console.log('index might exist', e.message); }

    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await conn.end();
  }
}
check();
