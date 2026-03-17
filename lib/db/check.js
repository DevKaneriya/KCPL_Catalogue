import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '../../.env' });

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await conn.execute(`SHOW COLUMNS FROM products`);
    fs.writeFileSync('cols.json', JSON.stringify(rows, null, 2));
  } finally {
    await conn.end();
  }
}
check();
