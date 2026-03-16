import mysql from 'mysql2/promise';
(async () => {
  try {
    const c = await mysql.createConnection('mysql://root@localhost:3306/catalog');
    console.log('Altering products.image_url to LONGTEXT...');
    await c.query("ALTER TABLE products MODIFY image_url LONGTEXT DEFAULT NULL;");
    console.log('Alter complete. Verifying length...');
    const [rows] = await c.query("SELECT id, CHAR_LENGTH(image_url) as len FROM products LIMIT 5");
    console.log(rows);
    await c.end();
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(1);
  }
})();