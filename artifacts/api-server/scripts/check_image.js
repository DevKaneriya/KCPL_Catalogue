const mysql = require('mysql2/promise');
(async () => {
  try {
    const c = await mysql.createConnection('mysql://root@localhost:3306/catalog');
    const [rows] = await c.query("SELECT id, name, CHAR_LENGTH(image_url) as len, LEFT(image_url,200) as head FROM products WHERE name LIKE 'Tata Indica Radiator1'");
    console.log(JSON.stringify(rows, null, 2));
    await c.end();
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(1);
  }
})();