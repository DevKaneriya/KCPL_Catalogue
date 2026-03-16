import mysql from 'mysql2/promise';
(async () => {
  try {
    const c = await mysql.createConnection('mysql://root@localhost:3306/catalog');
    const [rows] = await c.query("SHOW CREATE TABLE products");
    console.log(rows[0]['Create Table']);
    await c.end();
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(1);
  }
})();