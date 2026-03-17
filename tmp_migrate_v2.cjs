const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.resolve(__dirname, ".env"), "utf8");
const dbUrlMatch = env.match(/DATABASE_URL=(.*)/);
if (!dbUrlMatch) throw new Error("DATABASE_URL not found in .env");
const dbUrl = dbUrlMatch[1].trim();

async function migrate() {
  const conn = await mysql.createConnection(dbUrl);
  
  console.log("Dropping old tables...");
  await conn.execute(`DROP TABLE IF EXISTS brands`);
  await conn.execute(`DROP TABLE IF EXISTS application_categories`);
  await conn.execute(`DROP TABLE IF EXISTS product_types`);
  
  console.log("Creating new tables...");
  
  await conn.execute(`
    CREATE TABLE product_types (
      id int AUTO_INCREMENT PRIMARY KEY,
      name varchar(255) NOT NULL UNIQUE,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await conn.execute(`
    CREATE TABLE application_categories (
      id int AUTO_INCREMENT PRIMARY KEY,
      name varchar(255) NOT NULL,
      product_type_id int NOT NULL,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, product_type_id)
    )
  `);
  
  await conn.execute(`
    CREATE TABLE brands (
      id int AUTO_INCREMENT PRIMARY KEY,
      name varchar(255) NOT NULL,
      product_type_id int NOT NULL,
      application_category_id int NOT NULL,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, product_type_id, application_category_id)
    )
  `);
  
  console.log("Tables recreated successfully with hierarchy!");
  await conn.end();
}

migrate().catch(console.error);
