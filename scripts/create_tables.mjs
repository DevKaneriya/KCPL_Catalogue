import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env manually so script can run without installing dotenv at workspace root
import fs from 'fs';
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) {
      const key = m[1];
      let val = m[2];
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = process.env[key] ?? val;
    }
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set in .env');
  process.exit(1);
}

async function run() {
  const pool = await mysql.createPool({ uri: url });
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS roles (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      permissions JSON NOT NULL DEFAULT ('[]'),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`);

    await conn.query(`CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255),
      password_hash TEXT NOT NULL,
      role_id INT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    ) ENGINE=InnoDB;`);

    await conn.query(`CREATE TABLE IF NOT EXISTS categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      slug VARCHAR(255) NOT NULL UNIQUE,
      field_schema JSON,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`);

    await conn.query(`CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      category_id INT NOT NULL,
      name TEXT,
      sku_code TEXT,
      kcpl_code TEXT,
      vehicle_brand TEXT,
      engine_brand TEXT,
      product_type TEXT,
      size TEXT,
      image_url LONGTEXT,
      specifications JSON,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`);
    // Ensure existing installs can store full base64 images without truncation.
    await conn.query(`ALTER TABLE products MODIFY image_url LONGTEXT;`);

    await conn.query(`CREATE TABLE IF NOT EXISTS content_pages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title TEXT NOT NULL,
      content LONGTEXT,
      image_url LONGTEXT,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`);
    await conn.query(`ALTER TABLE content_pages MODIFY content LONGTEXT, MODIFY image_url LONGTEXT;`);

    await conn.query(`CREATE TABLE IF NOT EXISTS activity_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user TEXT NOT NULL DEFAULT 'Admin',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INT,
      details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`);

    console.log('Tables created or verified successfully');
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Failed to create tables:', err);
  process.exit(1);
});
