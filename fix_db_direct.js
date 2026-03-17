
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function fix() {
  const envPath = path.resolve(__dirname, './.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  if (!dbUrlMatch) {
    console.error('DATABASE_URL not found in .env');
    return;
  }
  const dbUrl = dbUrlMatch[1].trim();
  console.log('Connecting to', dbUrl);

  const connection = await mysql.createConnection(dbUrl);
  try {
    console.log('Altering products table...');
    await connection.execute('ALTER TABLE products MODIFY category_id INT NULL');
    await connection.execute('ALTER TABLE products MODIFY category_name VARCHAR(255) NULL');
    console.log('Success!');
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    await connection.end();
  }
}

fix();
